import { EMAIL_HEADER, ENDPOINTS } from './src/config.js';
import { addMail, extractList, getAllMails } from './src/api.js';
import { createMailCard } from './src/mail-view.js';
import { clearSettings, getSettings, isConfigured, saveSettings } from './src/storage.js';
import { buildAddMailPayload, isValidEmail, normalizeRecipients, validateAddMail, validateSettings } from './src/validation.js';

const state = {
  settings: { apiBaseUrl: '', email: '' },
  mails: [],
  recipients: [],
  mailsLoaded: false,
  loadingMails: false,
  sending: false,
};

const $ = (id) => document.getElementById(id);

const dom = {
  tabs: {},
  badge: $('config-badge'),
  brandSubtitle: $('brand-subtitle'),
  lockHint: $('lock-hint'),
  // settings
  settingsForm: $('settings-form'),
  baseUrl: $('input-base-url'),
  email: $('input-email'),
  errorBaseUrl: $('error-base-url'),
  errorEmail: $('error-email'),
  saveSettings: $('btn-save-settings'),
  clearSettingsBtn: $('btn-clear-settings'),
  settingsStatus: $('settings-status'),
  metaGet: $('meta-get'),
  metaPost: $('meta-post'),
  metaEmailHeader: $('meta-email-header'),
  // mails
  refreshMails: $('btn-refresh-mails'),
  mailsCount: $('mails-count'),
  mailsStatus: $('mails-status'),
  mailsList: $('mails-list'),
  // compose
  composeForm: $('compose-form'),
  chipInput: $('chip-input'),
  recipientChips: $('recipient-chips'),
  recipientInput: $('input-recipient'),
  addRecipient: $('btn-add-recipient'),
  errorTo: $('error-to'),
  subject: $('input-subject'),
  errorSubject: $('error-subject'),
  template: $('input-template'),
  errorTemplate: $('error-template'),
  sendMail: $('btn-send-mail'),
  resetCompose: $('btn-reset-compose'),
  composeStatus: $('compose-status'),
};

/* ------------------------------------------------------------------ boot */

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initStaticLabels();
  bindEvents();
  void boot();
});

async function boot() {
  state.settings = await getSettings();
  dom.baseUrl.value = state.settings.apiBaseUrl;
  dom.email.value = state.settings.email;
  renderRecipients();
  applyGating();
}

function initStaticLabels() {
  dom.metaGet.textContent = `GET ${ENDPOINTS.getAllMails}`;
  dom.metaPost.textContent = `POST ${ENDPOINTS.addMail}`;
  dom.metaEmailHeader.textContent = `${EMAIL_HEADER}: <email>`;
}

/* ------------------------------------------------------------------ tabs */

function initTabs() {
  for (const button of document.querySelectorAll('[data-tab]')) {
    dom.tabs[button.dataset.tab] = button;
  }
}

function activateTab(name) {
  for (const [key, button] of Object.entries(dom.tabs)) {
    const active = key === name;
    const panel = document.getElementById(button.getAttribute('aria-controls'));

    button.classList.toggle('tab--active', active);
    button.setAttribute('aria-selected', String(active));
    if (panel) panel.hidden = !active;
  }

  if (name === 'mails' && isConfigured(state.settings) && !state.mailsLoaded) {
    void loadMails();
  }

  if (name === 'compose') {
    dom.recipientInput.focus();
  }
}

/** Tab 2 and tab 3 stay locked until settings exist in local storage. */
function applyGating() {
  const configured = isConfigured(state.settings);

  dom.badge.hidden = configured;
  dom.lockHint.hidden = configured;
  dom.brandSubtitle.textContent = configured
    ? `${state.settings.email} · ${state.settings.apiBaseUrl}`
    : 'Not configured';

  for (const name of ['mails', 'compose']) {
    const button = dom.tabs[name];
    button.disabled = !configured;
    button.classList.toggle('tab--locked', !configured);
    button.title = configured ? '' : 'Save the settings first';
  }

  if (!configured) {
    state.mailsLoaded = false;
    activateTab('settings');
  }
}

/* --------------------------------------------------------------- events */

function bindEvents() {
  for (const [name, button] of Object.entries(dom.tabs)) {
    button.addEventListener('click', () => {
      if (button.disabled) return;
      activateTab(name);
    });
  }

  dom.settingsForm.addEventListener('submit', onSubmitSettings);
  dom.clearSettingsBtn.addEventListener('click', onClearSettings);

  dom.refreshMails.addEventListener('click', () => void loadMails());

  dom.composeForm.addEventListener('submit', onSubmitCompose);
  dom.addRecipient.addEventListener('click', () => commitRecipientInput());
  dom.resetCompose.addEventListener('click', () => resetCompose());

  dom.recipientInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === ';') {
      event.preventDefault();
      commitRecipientInput();
    } else if (event.key === 'Backspace' && !dom.recipientInput.value && state.recipients.length) {
      state.recipients.pop();
      renderRecipients();
    }
  });

  dom.recipientInput.addEventListener('blur', () => {
    if (dom.recipientInput.value.trim()) commitRecipientInput();
  });

  dom.recipientChips.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-index]');
    if (!button) return;
    state.recipients.splice(Number(button.dataset.removeIndex), 1);
    renderRecipients();
  });
}

/* ------------------------------------------------------------- settings */

async function onSubmitSettings(event) {
  event.preventDefault();

  const candidate = {
    apiBaseUrl: dom.baseUrl.value,
    email: dom.email.value,
  };

  const errors = validateSettings(candidate);
  showFieldErrors(
    { baseUrl: [dom.errorBaseUrl, dom.baseUrl], email: [dom.errorEmail, dom.email] },
    errors,
  );

  if (Object.keys(errors).length) {
    setStatus(dom.settingsStatus, 'Fix the highlighted fields.', 'err');
    return;
  }

  dom.saveSettings.disabled = true;
  try {
    state.settings = await saveSettings(candidate);
    dom.baseUrl.value = state.settings.apiBaseUrl;
    dom.email.value = state.settings.email;
    state.mailsLoaded = false;
    applyGating();
    setStatus(dom.settingsStatus, 'Settings saved to local storage. Other tabs unlocked.', 'ok');
    if (isConfigured(state.settings)) activateTab('mails');
  } catch (error) {
    setStatus(dom.settingsStatus, `Could not save settings: ${error?.message || error}`, 'err');
  } finally {
    dom.saveSettings.disabled = false;
  }
}

async function onClearSettings() {
  await clearSettings();
  state.settings = { apiBaseUrl: '', email: '' };
  dom.baseUrl.value = '';
  dom.email.value = '';
  showFieldErrors({ baseUrl: [dom.errorBaseUrl, dom.baseUrl], email: [dom.errorEmail, dom.email] }, {});
  state.mails = [];
  state.mailsLoaded = false;
  renderMails();
  applyGating();
  setStatus(dom.settingsStatus, 'Settings cleared. Tabs 2 and 3 are locked again.', 'ok');
}

/* ---------------------------------------------------------------- mails */

async function loadMails() {
  if (state.loadingMails || !isConfigured(state.settings)) return;

  state.loadingMails = true;
  dom.refreshMails.disabled = true;
  setStatus(dom.mailsStatus, 'Loading mails…');
  dom.mailsList.textContent = '';

  try {
    const response = await getAllMails(state.settings);
    state.mails = extractList(response);
    state.mailsLoaded = true;
    renderMails();

    if (state.mails.length) {
      setStatus(dom.mailsStatus, '');
    } else {
      setStatus(dom.mailsStatus, 'The API responded, but it contained no mail records.', 'err');
    }
  } catch (error) {
    state.mails = [];
    state.mailsLoaded = false;
    renderMails();
    setStatus(dom.mailsStatus, error?.message || 'Could not load mails.', 'err');
  } finally {
    state.loadingMails = false;
    dom.refreshMails.disabled = false;
  }
}

function renderMails() {
  dom.mailsList.textContent = '';
  dom.mailsCount.textContent = state.mails.length ? `${state.mails.length} record(s)` : '';

  if (!state.mails.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No mails to show. Press Refresh to fetch them again.';
    dom.mailsList.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  state.mails.forEach((mail, index) => fragment.appendChild(createMailCard(mail, index)));
  dom.mailsList.appendChild(fragment);
}

/* -------------------------------------------------------------- compose */

function renderRecipients() {
  dom.recipientChips.textContent = '';

  state.recipients.forEach((recipient, index) => {
    const chip = document.createElement('span');
    chip.className = 'chip';

    const label = document.createElement('span');
    label.textContent = recipient;
    label.title = recipient;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'chip__remove';
    remove.dataset.removeIndex = String(index);
    remove.setAttribute('aria-label', `Remove ${recipient}`);
    remove.textContent = '×';

    chip.append(label, remove);
    dom.recipientChips.appendChild(chip);
  });
}

/** Moves whatever is typed in the input into the recipients list. */
function commitRecipientInput({ silent = false } = {}) {
  const raw = dom.recipientInput.value.trim();
  if (!raw) return true;

  const parts = raw.split(/[,;\s]+/).filter(Boolean);

  for (const part of parts) {
    if (!isValidEmail(part)) {
      if (!silent) {
        showFieldErrors({ to: [dom.errorTo, dom.chipInput] }, { to: `"${part}" is not a valid email address.` });
        setStatus(dom.composeStatus, '');
      }
      return false;
    }
  }

  state.recipients = normalizeRecipients([...state.recipients, ...parts]);
  dom.recipientInput.value = '';
  renderRecipients();
  showFieldErrors({ to: [dom.errorTo, dom.chipInput] }, {});
  return true;
}

async function onSubmitCompose(event) {
  event.preventDefault();
  if (state.sending) return;

  commitRecipientInput({ silent: true });

  const values = {
    to: state.recipients,
    subject: dom.subject.value,
    template: dom.template.value,
  };

  const { errors, isValid } = validateAddMail(values);
  showFieldErrors(
    {
      to: [dom.errorTo, dom.chipInput],
      subject: [dom.errorSubject, dom.subject],
      template: [dom.errorTemplate, dom.template],
    },
    errors,
  );

  if (!isValid) {
    setStatus(dom.composeStatus, 'The server-side validation rules are not satisfied yet.', 'err');
    return;
  }

  const payload = buildAddMailPayload(values);
  state.sending = true;
  dom.sendMail.disabled = true;
  setStatus(dom.composeStatus, `Inserting mail for ${payload.To.length} recipient(s)…`);

  try {
    const response = await addMail(state.settings, payload);
    const okMessage = describeAddResult(response);
    resetCompose({ keepStatus: true });
    state.mailsLoaded = false;
    setStatus(dom.composeStatus, okMessage, 'ok');
  } catch (error) {
    setStatus(dom.composeStatus, error?.message || 'Could not insert the mail.', 'err');
  } finally {
    state.sending = false;
    dom.sendMail.disabled = false;
  }
}

function describeAddResult(response) {
  const created = response && typeof response === 'object' ? response : null;
  const id =
    created?.Id ??
    created?.id ??
    created?.MailId ??
    created?.mailId ??
    created?.TrackingId ??
    created?.trackingId;

  return id
    ? `Mail inserted. Server id: ${id}.`
    : 'Mail inserted successfully.';
}

function resetCompose({ keepStatus = false } = {}) {
  state.recipients = [];
  dom.recipientInput.value = '';
  dom.subject.value = '';
  dom.template.value = '';
  renderRecipients();
  showFieldErrors(
    {
      to: [dom.errorTo, dom.chipInput],
      subject: [dom.errorSubject, dom.subject],
      template: [dom.errorTemplate, dom.template],
    },
    {},
  );
  if (!keepStatus) setStatus(dom.composeStatus, '');
}

/* -------------------------------------------------------------- helpers */

function setStatus(element, message, kind = '') {
  element.textContent = message || '';
  element.classList.toggle('status--ok', kind === 'ok');
  element.classList.toggle('status--err', kind === 'err');
}

/** errors: { field: message }, targets: { field: [errorEl, inputEl] } */
function showFieldErrors(targets, errors) {
  for (const [field, [errorEl, inputEl]] of Object.entries(targets)) {
    const message = errors?.[field];
    errorEl.textContent = message || '';
    errorEl.hidden = !message;
    inputEl.classList.toggle('field--invalid', Boolean(message));
  }
}
