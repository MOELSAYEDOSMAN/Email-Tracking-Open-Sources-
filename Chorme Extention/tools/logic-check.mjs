import { buildAddMailPayload, validateAddMail, validateSettings, normalizeRecipients } from '../src/validation.js';
import { buildUrl, extractList, normalizeBaseUrl } from '../src/api.js';
import { createMailCard, stripHtml } from '../src/mail-view.js';

let failures = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) console.log(`ok   ${label}`);
  else { failures++; console.error(`FAIL ${label}\n  expected ${e}\n  actual   ${a}`); }
};

// ---- settings validation -------------------------------------------------
check('empty settings invalid', Object.keys(validateSettings({})), ['baseUrl', 'email']);
check('trailing slash url ok', validateSettings({ apiBaseUrl: 'https://x.dev/', email: 'a@b.com' }), {});
check('bad url', validateSettings({ apiBaseUrl: 'ftp://x', email: 'a@b.com' }).baseUrl.length > 0, true);
check('bad email', validateSettings({ apiBaseUrl: 'https://x.dev', email: 'nope' }).email.length > 0, true);

// ---- AddMailVM mirror ----------------------------------------------------
check('no recipients is invalid', validateAddMail({ to: [], subject: 's', template: 't' }).errors.to.length > 0, true);
check('bad recipient', validateAddMail({ to: ['a@b.com', 'oops'], subject: 's', template: 't' }).errors.to.length > 0, true);
check('missing sbject', validateAddMail({ to: ['a@b.com'], subject: '  ', template: 't' }).errors, { subject: 'Sbject is required.' });
check('missing templete', validateAddMail({ to: ['a@b.com'], subject: 's', template: '' }).errors, { template: 'Templete is required.' });
check('valid model', validateAddMail({ to: ['a@b.com'], subject: 's', template: '<p>t</p>' }).isValid, true);
check('recipients trimmed + deduped', normalizeRecipients([' A@b.com ', 'a@B.COM', '']), ['A@b.com']);

check('payload shape', buildAddMailPayload({
  to: ['first@example.com', 'second@example.com'],
  subject: ' Hello ',
  template: '<h1>Hi</h1>',
}), {
  To: [{ To: 'first@example.com' }, { To: 'second@example.com' }],
  Templete: '<h1>Hi</h1>',
  Sbject: 'Hello',
});

// ---- api helpers ---------------------------------------------------------
check('base url trailing slashes', normalizeBaseUrl('https://api.dev///'), 'https://api.dev');
check('url join', buildUrl('https://api.dev/', '/api/Mail/AddMail'), 'https://api.dev/api/Mail/AddMail');
check('url join without slash', buildUrl('https://api.dev', 'api/Mail'), 'https://api.dev/api/Mail');
check('bare array', extractList([{ id: 1 }]).length, 1);
check('items wrapper', extractList({ items: [{ id: 1 }, { id: 2 }] }).length, 2);
check('newtonsoft wrapper', extractList({ $values: [{ id: 1 }] }).length, 1);
check('nested newtonsoft', extractList({ data: { $values: [{ id: 1 }] } }).length, 1);
check('unknown shape', extractList({ nope: true }), []);
check('stripHtml', stripHtml('<p>Hello</p><p><b>world</b></p>'), 'Hello\nworld');
check('stripHtml drops scripts', stripHtml('<script>alert(1)</script><p>safe</p>'), 'safe');

// ---- DOM rendering (minimal stub) ---------------------------------------
class StubNode {
  constructor(tag) { this.tagName = tag; this.children = []; this.attrs = {}; this.dataset = {}; this._text = ''; }
  set className(v) { this.attrs.class = v; }
  get className() { return this.attrs.class ?? ''; }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  appendChild(child) { this.children.push(child); return child; }
  append(...nodes) { nodes.forEach((n) => this.appendChild(n)); }
  setAttribute(k, v) { this.attrs[k] = v; }
  addEventListener() {}
  remove() {}
  closest() { return null; }
}
globalThis.document = {
  createElement: (tag) => new StubNode(tag),
  createTextNode: (text) => { const n = new StubNode('#text'); n.textContent = text; return n; },
};

const card = createMailCard(
  { Sbject: 'Hi', To: [{ To: 'a@b.com' }], Templete: '<p>body</p>', CreatedAt: '2024-01-01T00:00:00Z' },
  0,
);
check('card subject', card.children[0].textContent, 'Hi');
check('card renders recipient row', card.textContent.includes('a@b.com'), true);
check('card has html preview button', card.children.some((c) => c.children?.some?.((g) => g.textContent === 'Preview HTML')), true);
check('empty mail falls back to index', createMailCard({}, 4).children[0].textContent, 'Mail #5');

console.log(failures ? `\n${failures} check(s) failed` : '\nall logic checks passed');
process.exitCode = failures ? 1 : 0;
