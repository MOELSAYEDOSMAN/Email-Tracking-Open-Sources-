# Mail Tracker Admin — Chrome Extension (Manifest V3)

A 3-tab popup extension for an email-tracking API:

| Tab | Purpose |
| --- | --- |
| **1. Settings** | Stores `API base URL` + `Email` in `chrome.storage.local`. |
| **2. All Mails** | `GET` all tracked mails and renders them (HTML preview included). |
| **3. New Mail** | `POST` a new mail using your `AddMailVM` contract. |

**Gating:** until both settings exist in local storage, tabs 2 and 3 are disabled
(lock icon, `disabled` attribute) and the popup always falls back to tab 1.

## Install (load unpacked)

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and pick this folder
   (`E:\Work\open sources\Email Tracking\Chorme Extention`).
4. Pin the extension, open the popup, fill both fields on the **Settings** tab and press
   **Save settings**.

The popup chrome itself stays open while you click around; a `Settings` save unlocks the
other two tabs immediately and switches to **All Mails**.

## Files

```
manifest.json          MV3 manifest (storage + <all_urls> host permission)
popup.html             3 tab buttons + 3 tab panels
popup.css              theme (light/dark via prefers-color-scheme)
popup.js               tabs, gating, settings form, mail list, compose form
src/config.js          endpoints, storage key, email header, timeout  <-- edit here
src/storage.js         chrome.storage.local read/write + isConfigured()
src/api.js             fetch wrapper, error shaping, list normalization
src/validation.js      client mirror of the C# data annotations + payload builder
src/mail-view.js       safe rendering of unknown mail DTOs
icons/                 icon16/32/48/128.png
tools/verify.mjs       optional static sanity check (node tools/verify.mjs)
tools/logic-check.mjs  optional logic tests (node tools/logic-check.mjs)
```

## API contract the extension assumes

| Action | Request |
| --- | --- |
| Get all mails | `GET {baseUrl}/api/Mail` |
| Insert mail | `POST {baseUrl}/api/Mail/AddMail` |

Both paths live in [`src/config.js`](src/config.js) (`ENDPOINTS`). Change those two strings if your
routes differ — nothing else needs editing.

The configured email is sent on **every** request as the `X-User-Email` header
(`EMAIL_HEADER` in `src/config.js`). If your API wants a query string, a bearer token or a body
field instead, change `buildHeaders()` in [`src/api.js`](src/api.js) — it is the only place that
touches identity.

Because the base URL is user-supplied, the manifest requests `<all_urls>` host permission so
extension pages can call it without CORS blocking. If your API is on one known origin, replace
`<all_urls>` with that origin.

### Insert-mail body (exactly matches `AddMailVM`)

`src/validation.js` → `buildAddMailPayload()` produces:

```json
{
  "To": [
    { "To": "first@example.com" },
    { "To": "second@example.com" }
  ],
  "Templete": "<h1>Hello</h1><p>Body…</p>",
  "Sbject": "Your subject"
}
```

Property names keep the PascalCase spelling of the C# model, including the original typos
`Templete` and `Sbject` — so no `[JsonPropertyName]` attributes are needed server-side.

### Validation mirror

| C# | Client rule |
| --- | --- |
| `[MinLength(1)] To` | at least one recipient chip |
| `[Required, EmailAddress] AddEmailToVM.To` | every recipient is a valid email |
| `[Required] Sbject` | non-empty |
| `[Required] Templete` | non-empty |

Server-side `ModelState` failures are surfaced too: the client reads `title` / `detail` /
`message` / `errors[]` from the response body and shows the message under the form.

## Notes

- The **All Mails** tab tolerates the usual list shapes: a bare array, `{ items: [...] }`,
  `{ data: [...] }`, `{ value: [...] }` and Newtonsoft's `{ "$values": [...] }`.
- Mail bodies are never injected as HTML into the popup. **Preview HTML** renders them in an
  `<iframe sandbox="">`, so scripts and same-origin access are blocked.
- Requests time out after 20 s (`REQUEST_TIMEOUT_MS`).
- **Clear** on the Settings tab removes the stored settings and re-locks tabs 2 and 3.

## Development check

```powershell
node tools/verify.mjs        # manifest + referenced files + popup.html/popup.js ids + imports
node tools/logic-check.mjs   # validation rules, AddMailVM payload, URL joining, list shapes, rendering
```

Both exit non-zero on failure.
