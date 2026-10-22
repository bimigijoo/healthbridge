# HealthBridge

Digital Health Record Management System for Migrant Workers. This academic project retains its Spring Boot backend, React frontend, PostgreSQL integration, Spring Security, and JWT authentication.

For the laptop-to-smartphone classroom demonstration, use [CLASSROOM_DEMO_GUIDE.md](CLASSROOM_DEMO_GUIDE.md). Its isolated H2 launchers do not restart the normal backend or expose PostgreSQL. A public tunnel requires explicit approval; physical phone acceptance remains a separate verification step.

## Requirements

- Java 17, Node.js with npm, and PostgreSQL.
- Backend: Spring Boot 4.1.1; Maven Wrapper 3.3.4 selects Maven 3.9.16.
- Frontend: React 19, React Router 7, Vite 8, and Lucide icons.
- Chrome for the browser tests, or a Playwright-supported browser selected with `PLAYWRIGHT_CHANNEL`.

## Local Setup

Use the existing PostgreSQL `healthbridge` database at `localhost:5432`. The configured database user is `postgres`. Supply `DB_PASSWORD` and `JWT_SECRET` securely as environment variables to the backend process. The JWT key must contain at least 32 UTF-8 bytes. Never commit environment values or credentials; `.env` files are ignored and are not automatically loaded by Spring Boot.

Start the backend from `healthbridge-backend`:

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.arguments=--spring.jpa.hibernate.ddl-auto=validate --spring.jpa.show-sql=false"
```

Normal configuration now also uses validation-only schema startup. Before starting this version on PostgreSQL, separately review and approve the additive emergency-passport migration described in [EMERGENCY_PASSPORT.md](EMERGENCY_PASSPORT.md). Missing tables must stop startup; do not switch to automatic schema updates. No migration or existing PostgreSQL data operation has been performed by this change.

Start the frontend from `healthbridge-frontend` in another terminal:

```powershell
npm ci
npm run dev -- --host 127.0.0.1 --port 5174
```

Open `http://127.0.0.1:5174`. The API defaults to same-origin `/api`, proxied by Vite to `http://localhost:8080`. Set `DEV_API_PROXY_TARGET` for another local backend, or `VITE_API_BASE_URL` for an explicit HTTPS public API address. Backend CORS retains the existing local origins and accepts an explicit `CORS_ALLOWED_ORIGINS` list.

## Verification

From `healthbridge-frontend`:

```powershell
npm run lint
npm run build
npm run test:ui
npm run test:live
npm audit
```

The `test:ui` browser suite intercepts every API request with synthetic fixtures. It checks navigation, registration, document operations, consent creation/revocation, provider consultation, admin status changes, expired sessions, and responsive layouts at desktop, tablet, and mobile widths. Browser screenshots and reports are ignored by Git. These mocked tests use port 5174; stop a conflicting server or use the matching local Vite server. In CI, the suite starts its own server. The separate `test:live` suite uses actual HTTPS and backend requests on private test ports, without API interception.

From `healthbridge-backend`:

```powershell
.\mvnw.cmd "-Dmaven.repo.local=target/.m2/repository" "-Dhealthbridge.build.directory=target/checkpoint-verification" verify -B -ntp
```

The isolated Maven cache is optional. Tests use an in-memory H2 database in PostgreSQL compatibility mode and synthetic credentials from `src/test/resources/application.properties`. They do not connect to the application PostgreSQL database or read uploaded medical files. Production packaging keeps H2 in test scope. An H2 test pass does not certify all PostgreSQL-specific behavior.

The separate verification build directory avoids updating a running application's `target/classes` and triggering DevTools reload. Live browser tests similarly build into `target/live-e2e-build`. Normal builds keep the existing default `target` directory.

The Windows wrapper now handles ordinary `.m2` directories and linked directories without indexing a null `Target` array. Its Maven version and trusted Maven Central distribution URL are unchanged.

## Existing Workflows

- Workers register and sign in, create a profile with a permanent server-generated Health ID, view a passport/QR, create medical records independently of provider consultations, upload existing reports, track follow-ups, and create or revoke temporary sharing sessions. Existing profiles and Health IDs are preserved.
- Worker APIs verify resource ownership for profiles, clinical entries, records, documents, timelines, follow-ups, sharing sessions, shared-record lists, and access logs.
- `/provider-access` provides temporary consent-based record access and consultation entry. Sharing QR links open this page automatically in a normal phone browser. Configure `PUBLIC_FRONTEND_BASE_URL` to a public HTTPS origin to enable the owner-only sharing QR; the Health ID passport QR remains separate. Provider access needs no account or installation.
- `/admin` manages account status. Backend role checks protect admin endpoints, and deactivation blocks already-issued JWTs on subsequent authenticated requests.
- `/api/admin/overview` provides read-only aggregate worker/profile counts, consent-session states, successful record views/consultation activity, and the last 24 hours of stored audit events. It returns numbers only, never clinical details, credentials, or provider identities. Rejected requests are not stored in the existing audit table, so this is not a complete security-event report.
- Documents accept PDF, JPEG, PNG, or WebP up to 10 MB, with matching extension, declared MIME type, and file signature. Generated storage filenames remain under the upload directory. Signature checks are not malware scanning.
- Remove attached documents before deleting a medical record. Record deletion removes sharing links transactionally and preserves session access logs.

New sharing sessions require explicit `authorizeConsultation: true`. `medicalRecordIds: []` grants consultation-only access; it never grants access to all records or automatically exposes later consultations. Existing sessions retain their original consultation permissions. Read-only sharing is not a separate capability in the current model. No schema migration is required for these first-time worker changes.

The authenticated passport reuses the allergy, existing-condition, and current-medication APIs, with worker add/edit/delete forms. Its permanent HTTPS QR uses a random, revocable reference and opens only saved, worker-selected emergency fields. Public sharing is disabled by default. Legacy Health ID references remain nondisclosing. Full medical records and consultation entry still require the separate expiring provider QR. See [EMERGENCY_PASSPORT.md](EMERGENCY_PASSPORT.md) for the additive migration, validation-only startup, environment settings, rollout, and verification checklist. No production migration or deployment has been performed.

Provider access is QR-first. New worker sessions display the QR before the sharing form; manual access codes remain in a fallback disclosure. The provider page clears displayed session data at expiry, but the backend still validates every read/write independently. The live HTTPS/H2 regression also checks concurrent identical consultation retries create exactly one record. Physical phone-camera recognition and public PostgreSQL deployment remain separate acceptance checks.

## Demo

See [DEMO.md](DEMO.md) for a synthetic-data walkthrough and verification checklist. The project does not seed users, promote administrators, delete existing data, or publish patient records automatically.

See [DEPLOYMENT.md](DEPLOYMENT.md) for the QR protocol, test isolation, anonymous bearer limitations, and the public HTTPS/PostgreSQL deployment plan. `test:live` uses real browser/API requests with forced, private H2 storage and a loopback test certificate; physical phone-camera and public deployment verification are separate.

## Checkpoint History

The resumed baseline commit `294a400` already combined lint fixes with earlier timeline/medical-record UI work. Its existing history was preserved. Subsequent commits separate ownership/security, registration/documents, UI/browser coverage, and final verification/documentation.
