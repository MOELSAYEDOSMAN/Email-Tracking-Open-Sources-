/**
 * Single place to adapt the extension to your API.
 * Everything here is consumed by ../popup.js through the modules in this folder.
 */

/** Key used inside chrome.storage.local. */
export const STORAGE_KEY = 'mailTracker.settings';

/** Settings that must exist in local storage before the other tabs unlock. */
export const DEFAULT_SETTINGS = Object.freeze({
  apiBaseUrl: '',
  email: '',
});

/**
 * Relative endpoint paths, appended to the configured base URL.
 * Change these two lines if your controller routes differ.
 */
export const ENDPOINTS = Object.freeze({
  getAllMails: '/api/Mail',
  addMail: '/api/Mail/AddMail',
});

/** The configured email is sent on every request with this header. */
export const EMAIL_HEADER = 'X-User-Email';

/** Abort a request that takes longer than this. */
export const REQUEST_TIMEOUT_MS = 20000;
