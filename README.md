# HealthBridge

Digital Health Record Management System for Migrant Workers. This academic project retains its Spring Boot backend, React frontend, PostgreSQL integration, Spring Security, and JWT authentication.

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

These runtime overrides validate the existing schema and prevent SQL output. The existing application configuration still uses `ddl-auto=update`; any schema changes needed for a fresh database must be reviewed separately before starting against it. These checkpoints do not run a migration or delete existing PostgreSQL data.

Start the frontend from `healthbridge-frontend` in another terminal:

```powershell
npm ci
npm run dev -- --host 127.0.0.1 --port 5174
```

Open `http://127.0.0.1:5174`. The API defaults to `http://localhost:8080/api`; set `VITE_API_BASE_URL` before starting Vite to use another API address. Backend CORS allows `localhost` and `127.0.0.1` on the existing local frontend ports 5173 and 5174.

## Verification

From `healthbridge-frontend`:

```powershell
npm run lint
npm run build
npm run test:ui
npm audit
```

The browser suite intercepts every API request with synthetic fixtures. It checks navigation, registration, document operations, consent creation/revocation, provider consultation, admin status changes, expired sessions, and responsive layouts at desktop, tablet, and mobile widths. Browser screenshots and reports are ignored by Git. The tests use port 5174; stop a conflicting server or use the matching local Vite server. In CI, the suite starts its own server.

From `healthbridge-backend`:

```powershell
.\mvnw.cmd "-Dmaven.repo.local=target/.m2/repository" verify -B -ntp
```

The isolated Maven cache is optional. Tests use an in-memory H2 database in PostgreSQL compatibility mode and synthetic credentials from `src/test/resources/application.properties`. They do not connect to the application PostgreSQL database or read uploaded medical files. Production packaging keeps H2 in test scope. An H2 test pass does not certify all PostgreSQL-specific behavior.

The Windows wrapper now handles ordinary `.m2` directories and linked directories without indexing a null `Target` array. Its Maven version and trusted Maven Central distribution URL are unchanged.

## Existing Workflows

- Workers register and sign in, create a health profile, view a Health ID passport/QR, manage medical records and supporting documents, track follow-ups, and create or revoke temporary sharing sessions.
- Worker APIs verify resource ownership for profiles, clinical entries, records, documents, timelines, follow-ups, sharing sessions, shared-record lists, and access logs.
- `/provider-access` already provides temporary consent-based record access and consultation entry. It does not require a permanent provider account. A session grants access to selected records until expiration or revocation; the Health ID QR is not a sharing credential.
- `/admin` manages account status. Backend role checks protect admin endpoints, and deactivation blocks already-issued JWTs on subsequent authenticated requests.
- Documents accept PDF, JPEG, PNG, or WebP up to 10 MB, with matching extension, declared MIME type, and file signature. Generated storage filenames remain under the upload directory. Signature checks are not malware scanning.
- Remove attached documents before deleting a medical record. Record deletion removes sharing links transactionally and preserves session access logs.

## Demo

See [DEMO.md](DEMO.md) for a synthetic-data walkthrough and verification checklist. The project does not seed users, promote administrators, delete existing data, or publish patient records automatically.

## Checkpoint History

The resumed baseline commit `294a400` already combined lint fixes with earlier timeline/medical-record UI work. Its existing history was preserved. Subsequent commits separate ownership/security, registration/documents, UI/browser coverage, and final verification/documentation.
