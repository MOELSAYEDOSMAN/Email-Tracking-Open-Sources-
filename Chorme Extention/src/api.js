import { EMAIL_HEADER, ENDPOINTS, REQUEST_TIMEOUT_MS } from './config.js';

export class ApiError extends Error {
  constructor(message, { status = 0, body = null, url = '' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.url = url;
  }
}

/** "https://host/api/" -> "https://host/api" */
export function normalizeBaseUrl(baseUrl) {
  return String(baseUrl ?? '').trim().replace(/\/+$/, '');
}

export function buildUrl(baseUrl, path) {
  const base = normalizeBaseUrl(baseUrl);
  if (!base) {
    throw new ApiError('API base URL is not configured.');
  }

  const target = String(path ?? '');
  if (/^https?:\/\//i.test(target)) return target;

  return base + (target.startsWith('/') ? target : `/${target}`);
}

function buildHeaders(settings, hasBody) {
  const headers = { Accept: 'application/json' };

  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }

  // The configured email identifies the caller.
  // Switch to a query string or a bearer token here if your API expects that.
  const email = String(settings?.email ?? '').trim();
  if (email) {
    headers[EMAIL_HEADER] = email;
  }

  return headers;
}

function parseBody(text, contentType) {
  if (!text) return null;
  const looksJson = /json/i.test(contentType || '') || /^[[{]/.test(text.trim());
  if (!looksJson) return text;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function describeError(status, data) {
  const statusText = status ? `HTTP ${status}` : 'Request failed';

  if (typeof data === 'string' && data.trim()) {
    return `${statusText}: ${data.trim().slice(0, 300)}`;
  }

  if (data && typeof data === 'object') {
    const detail =
      data.title ||
      data.detail ||
      data.message ||
      data.error ||
      (Array.isArray(data.errors) ? data.errors.join(', ') : null) ||
      flattenModelState(data.errors);

    if (detail) return `${statusText}: ${detail}`;
  }

  return statusText;
}

/** ASP.NET ModelState: { errors: { Sbject: ["The Sbject field is required."] } } */
function flattenModelState(errors) {
  if (!errors || typeof errors !== 'object') return null;

  const messages = [];
  for (const value of Object.values(errors)) {
    if (Array.isArray(value)) messages.push(...value);
    else if (typeof value === 'string') messages.push(value);
  }

  return messages.length ? messages.join(' ') : null;
}

async function request(path, { settings, method = 'GET', body } = {}) {
  const url = buildUrl(settings?.apiBaseUrl, path);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: buildHeaders(settings, body !== undefined),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      credentials: 'omit',
      cache: 'no-store',
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiError(`Request timed out after ${REQUEST_TIMEOUT_MS} ms.`, { url });
    }
    throw new ApiError(`Network error: ${error?.message || error}`, { url });
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  const data = parseBody(text, response.headers.get('content-type'));

  if (!response.ok) {
    throw new ApiError(describeError(response.status, data), {
      status: response.status,
      body: data,
      url,
    });
  }

  return data;
}

/** GET {base}/api/Mail */
export function getAllMails(settings) {
  return request(ENDPOINTS.getAllMails, { settings, method: 'GET' });
}

/** POST {base}/api/Mail/AddMail with an AddMailVM body. */
export function addMail(settings, payload) {
  return request(ENDPOINTS.addMail, { settings, method: 'POST', body: payload });
}

/**
 * Normalizes the many shapes an "all mails" endpoint can return into an array:
 * [...], { items: [...] }, { data: [...] }, { $values: [...] }, { value: [...] }, ...
 */
export function extractList(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];

  if (Array.isArray(data.$values)) return data.$values;

  for (const key of ['items', 'data', 'mails', 'results', 'records', 'value', 'list', 'rows']) {
    const candidate = data[key];
    if (Array.isArray(candidate)) return candidate;
    if (candidate && Array.isArray(candidate.$values)) return candidate.$values;
  }

  return [];
}
