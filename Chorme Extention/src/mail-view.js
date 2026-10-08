/**
 * Renders mail DTOs (GetMailVM) into DOM. Every value is written through
 * textContent, and HTML previews run inside a fully sandboxed iframe.
 *
 * GetMailVM          { id, subject, to: GetMailRecipientVM[], from, createdAt, templete }
 * GetMailRecipientVM { email, status, readOn }
 *
 * ASP.NET Core serializes to camelCase by default; PascalCase is also accepted.
 */

const pick = (obj, name) => obj?.[name] ?? obj?.[name[0].toUpperCase() + name.slice(1)];

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

const looksLikeHtml = (value) => /<\/?[a-z][\s\S]*>/i.test(String(value ?? ''));

function formatDate(value) {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString();
}

function row(label, value) {
  const line = document.createElement('p');
  line.className = 'mail__row';

  const bold = document.createElement('b');
  bold.textContent = `${label}: `;
  line.append(bold, document.createTextNode(value));

  return line;
}

function recipientsTable(recipients) {
  const table = document.createElement('table');
  table.className = 'mail__recipients table table-sm'; // drop "table table-sm" if you don't use Bootstrap

  const head = table.createTHead().insertRow();
  for (const label of ['Email', 'Status', 'Read On']) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    head.appendChild(th);
  }

  const bodyEl = table.createTBody();
  for (const recipient of recipients) {
    const tr = bodyEl.insertRow();
    tr.insertCell().textContent = pick(recipient, 'email') ?? '';
    tr.insertCell().textContent = pick(recipient, 'status') ?? '';
    tr.insertCell().textContent = formatDate(pick(recipient, 'readOn')) || '—';
  }

  return table;
}

/** Builds one mail card from a GetMailVM. */
export function createMailCard(mail, index) {
  const card = document.createElement('article');
  card.className = 'mail';

  const id = pick(mail, 'id');
  const subject = pick(mail, 'subject') || `Mail #${index + 1}`;
  const recipients = pick(mail, 'to') ?? [];
  const from = pick(mail, 'from');
  const createdAt = formatDate(pick(mail, 'createdAt'));
  const body = pick(mail, 'templete');

  const title = document.createElement('h3');
  title.className = 'mail__subject';
  title.textContent = subject;
  card.appendChild(title);

if (recipients.length) {
  const label = document.createElement('p');
  label.className = 'mail__row';
  label.innerHTML = '<b>To:</b>';
  card.append(label, recipientsTable(recipients));
}
  if (from) card.appendChild(row('From', from));
  if (createdAt) card.appendChild(row('Created', createdAt));
  if (id) card.appendChild(row('Id', id));

  if (body) {
    const actions = document.createElement('div');
    actions.className = 'mail__actions';

    if (looksLikeHtml(body)) {
      let frame = null;

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
    pre.textContent = stripHtml(body) || body;
    details.append(summary, pre);
    card.appendChild(details);
  }

  return card;
}