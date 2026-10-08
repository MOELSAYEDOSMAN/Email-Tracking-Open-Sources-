# Email Tracking

An open-source, self-hosted tool that tells you whether the email you sent was **actually opened**.

It is three pieces that work together:

| Piece | What it is | Where |
| --- | --- | --- |
| **API** | ASP.NET Core 9 Web API that stores tracked mails in MongoDB, sends them over SMTP, and serves a 1×1 tracking pixel | [`Api/EmailTracking.API`](Api/EmailTracking.API) |
| **Database** | MongoDB 7 — one document per tracked mail | [`docker-compose.yml`](docker-compose.yml) |
| **Admin UI** | Chrome extension (Manifest V3) to configure the API, list tracked mails and send a new one | [`Chorme Extention`](Chorme%20Extention) |

> **Project status: early / work in progress.** The core loop (store → send → pixel) is in place,
> but open events are not yet written back to the database and there is no authentication.
> Read [Known issues](#known-issues) before you rely on this for anything important.

---

## How it works

A normal email cannot tell you it was opened. This tool appends an invisible image to the HTML
body and watches for the download request:

```mermaid
sequenceDiagram
    participant Admin as Admin UI
    participant API as EmailTracking.API
    participant DB as MongoDB
    participant SMTP as SMTP server
    participant Reader as Recipient

    Admin->>API: POST /api/Mail/AddMail
    API->>API: inject the 1x1 tracking pixel into the HTML body
    API->>DB: insert the MailTracking document
    API->>SMTP: send one message per recipient
    SMTP-->>Reader: email arrives
    Reader->>API: GET /api/Mail/Read/{mailId} (the pixel)
    API-->>Reader: 1x1 transparent GIF
    API->>DB: record the open in ReadMails (planned)
    Admin->>API: GET /api/Mail
    API-->>Admin: tracked mails with open status
```

The pixel is injected in
[`TempleteHelper.AddSecrectTempelete`](Api/EmailTracking.API/Heleper/TempleteHelper.cs) and served by
`GET /api/Mail/Read/{mailId}` in [`MailController`](Api/EmailTracking.API/Controllers/MailController.cs).

---

## Tech stack

- **.NET 9 / ASP.NET Core** (`net9.0`) — minimal hosting, controllers, OpenAPI
- **MongoDB** via `MongoDB.Driver` 3.x — generic repository over a typed collection
- **MailKit / MimeKit** 4.x — STARTTLS SMTP delivery
- **Docker + Docker Compose** — API image plus MongoDB with authentication
- **Chrome Extension MV3** — plain ES modules, no build step, no bundler

---

## Repository layout

```
.
├── Api/
│   └── EmailTracking.API/           ASP.NET Core 9 Web API
│       ├── Controllers/             MailController - the HTTP surface
│       ├── Service/                 MailService, SmtpMailService, MongoRepository<T>
│       ├── Model/                   MailTracking, ReadMail, BaseEntity
│       ├── VM/                      AddMailVM (request), ResponesVM (envelope)
│       ├── Enum/                    MailTrackingStauts, StatusCode
│       ├── DbContextConfiguration/  ApplicationMongoDBContext
│       ├── Heleper/                 TempleteHelper - tracking-pixel injection
│       ├── Configuration/           EmailSetting (SMTP options binding)
│       ├── Dockerfile               multi-stage Linux image
│       ├── appsettings.json         committed configuration shape (no secrets)
│       └── appsettings.Example.json template for local secrets
├── Chorme Extention/                Chrome MV3 admin popup
│   ├── manifest.json                MV3 manifest
│   ├── popup.html / popup.css / popup.js
│   ├── src/                         config, storage, api, validation, mail-view
│   ├── icons/                       16 / 32 / 48 / 128 px
│   ├── tools/                       verify.mjs, logic-check.mjs
│   └── README.md                    extension-specific docs
├── DB/
│   └── docker-compose.yml           MongoDB only (alternative to the root file)
├── docker-compose.yml               API + MongoDB (full stack)
├── .env.example                     compose variables (copy to .env)
└── .gitignore
```

---

## Prerequisites

| Need | Version | Notes |
| --- | --- | --- |
| .NET SDK | **9.0** | `dotnet --version` |
| MongoDB | **7.x** | Only if you don't use the Compose file |
| Docker Desktop | recent | Recommended path; needed for the Compose quick start |
| Chrome / Chromium | **102+** | For the admin extension |
| SMTP account | — | Gmail needs an [App Password](https://myaccount.google.com/apppasswords), not your login password |

---

## Quick start (Docker, recommended)

Brings up MongoDB plus the API in one command.

```bash
git clone <your-fork-url> email-tracking
cd email-tracking

cp .env.example .env        # PowerShell: Copy-Item .env.example .env
# edit .env: MONGO_ROOT_PASSWORD, SMTP_USER, SMTP_PASSWORD, SMTP_SENDER_EMAIL

docker compose up --build
```

| Service | URL / address |
| --- | --- |
| API | http://localhost:5099 |
| MongoDB | `mongodb://admin:<password>@localhost:27017/EmailTrackingAPI?authSource=admin` |

Verify it is up:

```bash
curl -i -X POST http://localhost:5099/api/Mail/AddMail \
  -H "Content-Type: application/json" \
  -d '{"To":[{"To":"you@example.com"}],"Sbject":"Hello","Templete":"<h1>Hi</h1>"}'
```

Useful Compose commands:

```bash
docker compose logs -f api          # follow API logs
docker compose config               # validate the Compose file
docker compose down                 # stop, keep the database volume
docker compose down -v              # stop and delete tracked mails
```

The API reads its settings from environment variables in
[`docker-compose.yml`](docker-compose.yml). `__` is the ASP.NET Core nesting separator, so
`EmailSetting__SmtpPassword` maps to `EmailSetting:SmtpPassword`. That means **no secret is ever
baked into the image** — see [`.dockerignore`](Api/EmailTracking.API/.dockerignore).

---

## Quick start (local development)

Run MongoDB in Docker, the API on the host with `dotnet run`.

> Only one MongoDB can hold port 27017 at a time. Do not start this alongside the root
> `docker-compose.yml`, which also publishes 27017.

```bash
# 1) database only - either option leaves admin/admin on localhost:27017,
#    matching the default connection string
docker compose -f DB/docker-compose.yml up -d      # the DB/ Compose file (mongo:latest)

# ...or a throwaway container instead:
docker run -d --name emailtracking-mongo -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=admin \
  -e MONGO_INITDB_DATABASE=EmailTrackingAPI \
  -v emailtracking-mongo-data:/data/db \
  mongo:7

# 2) secrets - never put these in appsettings.json
cd Api/EmailTracking.API
dotnet user-secrets init
dotnet user-secrets set "EmailSetting:SmtpUser" "you@example.com"
dotnet user-secrets set "EmailSetting:SmtpPassword" "<app-password>"
dotnet user-secrets set "EmailSetting:SenderEmail" "you@example.com"

# 3) run (http profile -> http://localhost:5099)
dotnet run
```

With `Microsoft.AspNetCore.OpenApi` wired up, the OpenAPI document is available in Development at
`http://localhost:5099/openapi/v1.json`.

---

## Configuration

Settings are read from `appsettings.json`, then `appsettings.{Environment}.json`, then user secrets,
then environment variables — **later sources win**. `appsettings.Example.json` shows the required
shape.

| Key | Purpose | Example |
| --- | --- | --- |
| `ConnectionStrings:DefaultConnection` | MongoDB connection string; the database name is taken from it | `mongodb://admin:admin@localhost:27017/EmailTrackingAPI?authSource=admin` |
| `EmailSetting:SmtpServer` | SMTP host | `smtp.gmail.com` |
| `EmailSetting:SmtpPort` | SMTP port (STARTTLS is always used) | `587` |
| `EmailSetting:SmtpUser` | SMTP login | `you@example.com` |
| `EmailSetting:SmtpPassword` | SMTP password / app password | `<app-password>` |
| `EmailSetting:SenderEmail` | `From` address on outgoing mail | `you@example.com` |

Environment-variable form for containers:

```bash
ConnectionStrings__DefaultConnection="mongodb://admin:admin@mongo:27017/EmailTrackingAPI?authSource=admin"
EmailSetting__SmtpServer="smtp.gmail.com"
EmailSetting__SmtpPort="587"
EmailSetting__SmtpUser="you@example.com"
EmailSetting__SmtpPassword="<app-password>"
EmailSetting__SenderEmail="you@example.com"
```

> `appsettings.json` is committed and contains **empty** SMTP values on purpose. Supply the real
> ones per machine. If a credential ever lands in a commit, rotate it — removing the file later does
> not remove it from history.

---

## API reference

Base URL in local development: `http://localhost:5099`.

### `POST /api/Mail/AddMail`

Stores a tracked mail, injects the tracking pixel and sends one SMTP message per recipient.

```json
{
  "To": [
    { "To": "first@example.com" },
    { "To": "second@example.com" }
  ],
  "Sbject": "Your subject",
  "Templete": "<h1>Hello</h1><p>Body…</p>"
}
```

| Field | Type | Validation |
| --- | --- | --- |
| `To` | `AddEmailToVM[]` | `[MinLength(1)]`, each entry `[Required, EmailAddress]` |
| `Sbject` | `string` | `[Required]` — note the spelling, it is part of the wire contract |
| `Templete` | `string` | `[Required]` — HTML template, spelling above applies |

Responses:

- `200 OK` → body `true`
- `400 Bad Request` → ASP.NET Core `ProblemDetails` / ModelState errors (automatic, because of `[ApiController]`)

### `GET /api/Mail/Read/{mailId}`

The tracking pixel. Returns a 1×1 transparent GIF (`image/gif`) regardless of whether `mailId`
exists, so a bad id never shows a broken image. Intended side effect: record an open in
`ReadMails` — see [Known issues](#known-issues).

### `GET /api/Mail`

**Not implemented yet.** `MongoRepository<T>.GetAllAsync()` exists but no controller action exposes
it. This is the endpoint the extension's *All Mails* tab calls.

Mail documents are stored in the **`MailTrackings`** collection (the repository derives the name from
`typeof(T).Name`).

---

## Chrome extension (admin UI)

Full documentation: [`Chorme Extention/README.md`](Chorme%20Extention/README.md).

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. **Load unpacked** → select the [`Chorme Extention`](Chorme%20Extention) folder.
4. Open the popup and fill in the **Settings** tab:
   - **API base URL** — e.g. `http://localhost:5099`
   - **Email** — sent as the `X-User-Email` header on every request (the API currently ignores it)
5. **Save settings**, then use **All Mails** / **New Mail**.

Endpoint paths and the header name live in one place:
[`src/config.js`](Chorme%20Extention/src/config.js).

Static checks (no dependencies, plain Node):

```bash
cd "Chorme Extention"
node tools/verify.mjs        # manifest, referenced files, DOM ids, imports
node tools/logic-check.mjs   # validation rules, payload shape, URL joining, rendering
```

---

## Data model

One document per tracked mail in `EmailTrackingAPI.MailTrackings`:

```json
{
  "_id": "673f1c2e8b4e1a0f9c3d5b7a",
  "From": "Me",
  "To": ["first@example.com", "second@example.com"],
  "Stauts": 1,
  "Subject": "Your subject",
  "Templete": "<html><h1>Hello</h1><p>Body…</p> <img src=\"http://host/api/Mail/Read/673f…\" width=\"1\" height=\"1\"></html>",
  "ReadMails": [],
  "CreateBy": null,
  "MofiyBy": null,
  "DeletedBy": null,
  "CreatedOn": "2025-01-01T00:00:00.000Z",
  "MofiyOn": null,
  "DeletedOn": null,
  "IsDeleted": false
}
```

`MailTrackingStauts` ([file](Api/EmailTracking.API/Enum/MailTrackingStauts.cs)):

| Value | Name |
| --- | --- |
| 1 | `Sent` |
| 2 | `Delivered` |
| 3 | `Opened` |
| 4 | `Clicked` |
| 5 | `Bounced` |
| 6 | `Unsubscribed` |

Each open is meant to append a `ReadMail` `{ To, Status: Opened, CreatedOn, … }` entry, which is why
`ReadMails` is an array rather than a flag.

> The identifiers `Stauts`, `MofiyBy` and `MofiyOn` are misspelled in the C# model. They are
> serialized with `nameof(...)`, so **renaming a property changes the stored field name** and breaks
> existing documents. Rename deliberately, with a migration.

---

## Limits of open tracking

Worth understanding before you trust a "not opened" result:

- **Images are often blocked.** Many clients block remote images by default until the reader opts in,
  so a real open can look like no open.
- **Privacy proxies prefetch the pixel.** Gmail and Apple Mail Proxy fetch images when the mail is
  *delivered*, which can make "opened" fire without a human reading it, and Apple's Mail Privacy
  Protection makes opens close to meaningless for Apple Mail recipients.
- **One pixel, one mail.** The tracking URL identifies the *mail*, not the recipient, so with
  multiple recipients you cannot tell who opened it. Per-recipient attribution needs one tracking id
  per recipient (see the roadmap).
- **Plain-text-only mails are never tracked** — there is no HTML to carry the image.
- **Corporate image scanners** can produce false opens.

Treat the signal as "probably opened", not proof.

---

## Production notes

- **Use HTTPS and a public hostname.** The pixel URL is built from `Request.Scheme` +
  `Request.Host`, so the address the API sees must be reachable from the recipient's mail client.
  `localhost` will never be fetched.
- **Behind a reverse proxy, forwarded headers matter.** Terminate TLS at nginx/Caddy/Traefik and add
  `UseForwardedHeaders()` so the generated pixel URL uses the public `https://` origin instead of the
  container's internal `http://`. As shipped, the injected URL will use the internal scheme/host when
  a proxy is in front.
- **The API is unauthenticated.** Anyone who can reach `POST /api/Mail/AddMail` can send email
  through your SMTP account. Keep it on a private network, or put an authenticating proxy / API key
  in front of it, before exposing it.
- **CORS is `AllowAll`** in `Program.cs` — fine for local development, tighten it for a public
  deployment.
- `UseHttpsRedirection()` is enabled while the container only listens on HTTP; with no HTTPS endpoint
  configured it logs a warning and lets requests through. That is expected.

---

## Known issues

These are real gaps in the current code, listed so nobody has to rediscover them:

1. **Opens are never persisted.** `MailService.UpdateReadStatus`
   ([`MailService.cs`](Api/EmailTracking.API/Service/MailService.cs)) compares each recipient against
   a local `var email = ""`, so the lookup always fails and no `ReadMail` is appended. The pixel still
   returns `200`, so the mail renders correctly and the failure is silent. **The core feature is
   therefore not functional yet.**
2. **`GET /api/Mail` is missing**, so the extension's *All Mails* tab gets a 404.
3. **No authentication or authorization.** `UseAuthorization()` is called with no authentication
   scheme, and the extension's `X-User-Email` header is accepted but ignored.
4. **`From` is hardcoded to `"Me"`** in `AddMailVM.IClone()` instead of using the configured sender.
5. **Multi-recipient mails share one tracking id**, so opens cannot be attributed to a person.
6. **Minor**: `ResponesVM<T>`'s factory methods are private (unreachable), `Code/SmtpServiceConfigration`
   is an empty class, and the `*.http` scratch file still points at the template's `weatherforecast`
   endpoint.

Suggested next steps: implement `GET /api/Mail`, fix open recording (ideally with a per-recipient
tracking id), add authentication, then record open metadata (timestamp, user agent, coarse IP) and
move SMTP delivery to a background queue so a slow send never blocks the HTTP request.

---

## Contributing

1. Fork and branch (`git checkout -b feature/short-name`).
2. Keep the wire contract stable: the property names in `AddMailVM` and the MongoDB field names are
   consumed by the extension and by existing documents.
3. Run the extension's static checks (`node tools/verify.mjs`, `node tools/logic-check.mjs`) and make
   sure `dotnet build` is clean.
4. Open a pull request describing the change and how you verified it.

Please never commit credentials — use user secrets, environment variables or a git-ignored
`appsettings.Development.json`.

## License

Not chosen yet. Add a `LICENSE` file before publishing (MIT and Apache-2.0 are both common for a
project like this).
