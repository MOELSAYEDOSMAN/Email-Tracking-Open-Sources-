/**
 * Helpers that turn an unknown mail DTO into DOM. Nothing here trusts the
 * payload: every value is written through textContent, and HTML previews run
 * inside a fully sandboxed iframe.
 */

const SUBJECT_KEYS = ['Sbject', 'sbject', 'Subject', 'subject', 'Title', 'title', 'Name', 'name'];
const TO_KEYS = ['To', 'to', 'ToEmails', 'toEmails', 'Recipients', 'recipients', 'Emails', 'emails'];
const FROM_KEYS = ['From', 'from', 'Sender', 'sender', 'FromEmail', 'fromEmail'];
const DATE_KEYS = [
  'CreatedAt',
  'createdAt',
  'CreatedDate',
  'createdDate',
  'SentAt',
  'sentAt',
  'Date',
  'date',
  'InsertDate',
  'insertDate',
];
const BODY_KEYS = ['Templete', 'templete', 'Template', 'template', 'Body', 'body', 'Html', 'html', 'Content', 'content'];
const ID_KEYS = ['Id', 'id', 'MailId', 'mailId', 'TrackingId', 'trackingId'];

function readField(source, keys) {
  if (!source || typeof source !== 'object') return undefined;

  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }

  return undefined;
}

function stringifyValue(value) {
  if (value === undefined || value === null) return '';

  if (Array.isArray(value)) {
    return value.map((item) => stringifyValue(item)).filter(Boolean).join(', ');
  }

  if (typeof value === 'object') {
    const nested = readField(item0(value), ['To', 'to', 'Email', 'email', 'Address', 'address', 'Name', 'name']);
    return nested !== undefined ? stringifyValue(nested) : JSON.stringify(value);
  }

  return String(value);
}

function item0(value) {
  return Array.isArray(value) ? value[0] : value;
}

export function stripHtml(value) {
  return String(value ?? '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/^ +/gm, '')
    .replace(/ +$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function looksLikeHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(String(value ?? ''));
}

function formatDate(value) {
  const raw = stringifyValue(value);
  if (!raw) return '';
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleString();
}

function row(label, value) {
  const line = document.createElement('p');
  line.className = 'mail__row';

  const bold = document.createElement('b');
  bold.textContent = `${label}: `;
  line.appendChild(bold);
  line.appendChild(document.createTextNode(value));

  return line;
}

/** Builds one mail card. */
export function createMailCard(mail, index) {
  const card = document.createElement('article');
  card.className = 'mail';

  const id = stringifyValue(readField(mail, ID_KEYS));
  const subject = stringifyValue(readField(mail, SUBJECT_KEYS)) || `Mail #${index + 1}`;
  const to = stringifyValue(readField(mail, TO_KEYS));
  const from = stringifyValue(readField(mail, FROM_KEYS));
  const date = formatDate(readField(mail, DATE_KEYS));
  const body = stringifyValue(readField(mail, BODY_KEYS));

  const title = document.createElement('h3');
  title.className = 'mail__subject';
  title.textContent = subject;
  card.appendChild(title);

  if (to) card.appendChild(row('To', to));
  if (from) card.appendChild(row('From', from));
  if (date) card.appendChild(row('Date', date));
  if (id) card.appendChild(row('Id', id));

  if (body) {
    const actions = document.createElement('div');
    actions.className = 'mail__actions';

    const text = stripHtml(body);
    const isHtml = looksLikeHtml(body);

    let frame = null;
    if (isHtml) {
      const previewBtn = document.createElement('button');
      previewBtn.type = 'button';
      previewBtn.className = 'btn btn--sm';
      previewBtn.textContent = 'Preview HTML';
      previewBtn.addEventListener('click', () => {
        if (frame) {
          frame.remove();
          frame = null;
          previewBtn.textContent = 'Preview HTML';
          return;
        }

        frame = document.createElement('iframe');
        frame.className = 'mail__frame';
        frame.setAttribute('sandbox', ''); // no scripts, no same-origin
        frame.setAttribute('referrerpolicy', 'no-referrer');
        frame.srcdoc = body;
        card.appendChild(frame);
        previewBtn.textContent = 'Hide preview';
      });
      actions.appendChild(previewBtn);
    }

    card.appendChild(actions);

    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Templete';
    const pre = document.createElement('pre');
    pre.className = 'mail__body';
    pre.textContent = text || body;
    details.append(summary, pre);
    card.appendChild(details);
  }

  return card;
}
