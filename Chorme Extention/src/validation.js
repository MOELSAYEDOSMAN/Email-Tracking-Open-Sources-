/**
 * Client-side mirror of the server-side data annotations:
 *
 *   public class AddMailVM
 *   {
 *       [MinLength(1)]                       -> at least one recipient
 *       public AddEmailToVM[] To { get; set; }
 *       [Required] public string Templete { get; set; }
 *       [Required] public string Sbject   { get; set; }
 *   }
 *   public class AddEmailToVM
 *   {
 *       [Required, EmailAddress] public string To { get; set; }
 *   }
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value) {
  return EMAIL_RE.test(String(value ?? '').trim());
}

export function isValidHttpUrl(value) {
  try {
    const url = new URL(String(value ?? '').trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** @returns {Record<string, string>} field -> message (empty object = valid) */
export function validateSettings({ apiBaseUrl, email } = {}) {
  const errors = {};

  if (!String(apiBaseUrl ?? '').trim()) {
    errors.baseUrl = 'API base URL is required.';
  } else if (!isValidHttpUrl(apiBaseUrl)) {
    errors.baseUrl = 'Enter a valid http(s) URL, for example https://mail-api.example.com';
  }

  if (!String(email ?? '').trim()) {
    errors.email = 'Email is required.';
  } else if (!isValidEmail(email)) {
    errors.email = 'Enter a valid email address.';
  }

  return errors;
}

/** @returns {{ errors: Record<string, string>, isValid: boolean }} */
export function validateAddMail({ to, subject, template } = {}) {
  const errors = {};
  const recipients = normalizeRecipients(to);

  // [MinLength(1)] on To
  if (recipients.length === 0) {
    errors.to = 'Add at least one recipient (MinLength(1)).';
  } else if (recipients.some((item) => !isValidEmail(item))) {
    // [Required, EmailAddress] on every AddEmailToVM.To
    errors.to = 'Every recipient must be a valid email address.';
  }

  // [Required] on Sbject
  if (!String(subject ?? '').trim()) {
    errors.subject = 'Sbject is required.';
  }

  // [Required] on Templete
  if (!String(template ?? '').trim()) {
    errors.template = 'Templete is required.';
  }

  return { errors, isValid: Object.keys(errors).length === 0 };
}

/** ["a@b.com", " a@b.com "] -> ["a@b.com"] (trimmed, de-duplicated, order kept) */
export function normalizeRecipients(to) {
  const list = Array.isArray(to) ? to : [];
  const seen = new Set();
  const result = [];

  for (const raw of list) {
    const value = String(raw ?? '').trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }

  return result;
}

/** Exact JSON body of AddMailVM (PascalCase property names). */
export function buildAddMailPayload({ to, subject, template } = {}) {
  return {
    To: normalizeRecipients(to).map((value) => ({ To: value })),
    Templete: String(template ?? ''),
    Sbject: String(subject ?? '').trim(),
  };
}
