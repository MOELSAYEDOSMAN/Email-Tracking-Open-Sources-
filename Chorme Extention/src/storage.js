import { DEFAULT_SETTINGS, STORAGE_KEY } from './config.js';
import { validateSettings } from './validation.js';

/** Reads the settings object from chrome.storage.local (empty values when missing). */
export async function getSettings() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const value = stored?.[STORAGE_KEY];

  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_SETTINGS };
  }

  return {
    apiBaseUrl: String(value.apiBaseUrl ?? '').trim(),
    email: String(value.email ?? '').trim(),
  };
}

/** Persists the settings object and returns the normalized copy. */
export async function saveSettings(settings = {}) {
  const clean = {
    apiBaseUrl: String(settings.apiBaseUrl ?? '').trim().replace(/\/+$/, ''),
    email: String(settings.email ?? '').trim(),
  };

  await chrome.storage.local.set({ [STORAGE_KEY]: clean });
  return clean;
}

export async function clearSettings() {
  await chrome.storage.local.remove(STORAGE_KEY);
}

/**
 * Gate used by the popup: the other tabs stay locked until both the
 * API base URL and a valid email exist in local storage.
 */
export function isConfigured(settings) {
  return Object.keys(validateSettings(settings)).length === 0;
}
