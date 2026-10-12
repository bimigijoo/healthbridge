# Academic QR Demo Deployment Plan

No deployment, tunnel, or public database exposure is authorized or performed by this change.

## Architecture

Use one public HTTPS origin, for example `https://healthbridge-demo.example.edu`:

- Serve the Vite production `dist` files from a static web server with SPA fallback for `/provider-access` and the existing routes. `vite preview` is a local preview tool, not the production server ([Vite deployment guide](https://vite.dev/guide/static-deploy.html)).
- Reverse-proxy `/api/` on that same origin to a Spring Boot service on loopback or a private network. The default frontend API address is now `/api`; the Vite development server proxies it to the existing local backend.
- Keep PostgreSQL private. Create a separate synthetic demonstration database or use an approved existing demo database. Do not expose port 5432, tunnel an existing patient database, seed existing data, or change its schema without a separate review.
- Terminate TLS with a publicly trusted certificate. Redirect HTTP to HTTPS, keep the QR's configured hostname canonical, and restrict backend access to the proxy. If forwarded headers are needed, accept them only from the trusted proxy ([Spring Boot proxy guidance](https://docs.spring.io/spring-boot/how-to/webserver.html)).

## Configuration

Backend runtime environment:

| Variable | Purpose |
| --- | --- |
| `PUBLIC_FRONTEND_BASE_URL` | Required for sharing QR: the real public HTTPS origin, without path, credentials, query, or fragment |
| `CORS_ALLOWED_ORIGINS` | Explicit public frontend origin(s), comma-separated; no wildcard; include the origin carried by proxy-forwarded browser requests |
| `SPRING_DATASOURCE_URL` | Approved private PostgreSQL JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | Demo database account with appropriate permissions |
| `DB_PASSWORD` | Database secret supplied through the hosting secret store |
| `JWT_SECRET` | Strong JWT key, at least 32 UTF-8 bytes, supplied privately |
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | Set `validate` for the existing reviewed schema; do not rely on automatic `update` during deployment |
| `SPRING_JPA_SHOW_SQL` | Keep `false`; do not enable SQL bind-value or request-detail logging |
| `SERVER_ADDRESS` / `SERVER_PORT` | Private backend listener chosen for the deployment |
| `FILE_UPLOAD_DIR` | Durable private document-storage path with restricted access |

Frontend build environment:

- Prefer the default same-origin `/api` address. If a separate API is required, set `VITE_API_BASE_URL` to its complete HTTPS `/api` address at build time and configure the backend CORS origin and custom headers accordingly.
- Vite variables are public browser configuration. Never include database secrets or JWT keys in them.
- There is no localhost fallback for production QR links. Without a public frontend address, QR generation reports unavailable while the manual sharing code still works. An explicitly configured non-HTTPS address fails backend startup validation.

## Proxy Requirements

1. Serve `/provider-access` through SPA fallback, preserving URL fragments in browser navigation.
2. Proxy `/api/` to the private backend without stripping the API prefix. Permit `X-HealthBridge-Access-Code` and `Idempotency-Key` headers.
3. Send `Referrer-Policy: no-referrer` and `Cache-Control: no-store` for the provider page, sharing QR, and clinical API responses. Do not place these routes behind a public response cache or service worker.
4. Log method, route template, status, and timing only. Never log access-code headers, Authorization headers, consultation bodies, or QR contents. Disable request URL logging on legacy provider routes containing a code.
5. Add modest rate limits for anonymous access validation and consultation submission, plus standard request-size and connection limits. Do not add analytics or third-party scripts to the provider page.
6. Use CSP appropriate to the bundled frontend: same-origin scripts/styles, QR blob images, and the approved API origin. Deploy public HTTPS before advertising any QR links.

## Exact QR Workflow

The worker signs in and selects records in Consent & Sharing. Creating a session retains the existing random UUID bearer code and expiration. The owner-only QR endpoint encodes a URL of this form:

```text
https://<configured-public-origin>/provider-access#access=<temporary-code>
```

The QR contains no Health ID, medical information, or permanent JWT. It is distinct from the Health ID passport QR. The provider's default phone camera should recognize the HTTPS URL and offer to open it in the normal browser; no app, account, login, embedded scanner, or manual typing is required for the link flow.

The provider page captures the fragment into component memory, clears it from the visible URL before issuing the validation request, and sends it to the backend in `X-HealthBridge-Access-Code`. URI fragments are not part of normal server retrieval requests ([RFC 3986, section 3.5](https://www.rfc-editor.org/rfc/rfc3986#section-3.5)). There is no credential in browser local/session storage, API paths, or API queries in the new flow.

Every record read and consultation write checks an active, unexpired, unrevoked session. Only explicitly selected records for that session's worker are returned. Consultation submissions require a UUID `Idempotency-Key`; the existing audit table stores a retry receipt containing only a request ID and record ID. A session row lock serializes submission retries with revocation. The public audit response still shows `ADD_CONSULTATION`. No new table, column, or migration is required.

Legacy provider code-in-path endpoints remain available for existing clients, but consultation callers must now supply an idempotency key and valid clinical details. The updated manual-entry page uses the new header endpoints too.

## Anonymous Access Limitations

Anyone holding the QR or code has the session's bearer permissions until it expires or is revoked. Provider identity is self-reported, not independently verified. A browser may retain a scanned link in the camera app, browser synchronization, extensions, or external history; clearing this page's URL does not erase those external copies. Previously viewed information and screenshots cannot be recalled after revocation.

Consultations are plain text, trimmed and validated for dates, control characters, and the existing 255-character database field limits. React escapes rendered text. Duplicate protection covers retries with the same request ID, including concurrent requests and application restarts; explicitly starting another consultation creates a new request ID. Anonymous endpoints still need operational rate limiting and monitoring at the proxy.

## Test Levels and Real-Phone Checklist

1. `npm run test:ui` uses mocked APIs. It checks desktop/tablet/mobile layout, QR-link auto-access, URL cleanup, fallback entry, denial states, and existing workflows. It cannot prove live mobile access.
2. Backend tests use isolated H2 and the real Spring security chain. They decode the server PNG using ZXing and check HTTPS links, ownership, record scope, expiration/revocation, consultation validation, durable retry behavior, and worker timeline persistence.
3. `npm run test:live` starts an actual Spring Boot process with a forced H2 database and a loopback-only HTTPS production frontend/proxy. It registers/logs in a synthetic worker, creates records through the worker API, creates sharing through the UI, decodes the actual PNG, opens that exact HTTPS link in a separate anonymous mobile-sized browser, submits a consultation, checks the real worker timeline, and verifies denial after revocation. No API mocking is used. Its ephemeral self-signed certificate is accepted only by the test browser.
4. Before claiming real-phone verification, deploy the approved synthetic demo to a reachable public HTTPS hostname with a trusted certificate and PostgreSQL. Set the public origin, verify SPA fallback and `/api`, and repeat the flow with Android and iPhone default cameras, including on cellular data. Verify no login/installation prompt, URL cleanup, selected-record scope, consultation visibility, and denial of reads/writes after revocation or expiration. Review sanitized proxy logs for credential leakage.

The local HTTPS browser test does not prove hardware-camera recognition, public reachability, trusted-certificate behavior on a phone, or PostgreSQL-specific behavior. Those checks remain manual deployment acceptance criteria.

### Verification History

During development, the first live-test launcher failed to load its test configuration and connected to the existing local PostgreSQL database before aborting because port 8080 was occupied. No browser E2E requests ran in that attempt. Hibernate initialized with the existing `ddl-auto=update` setting, so this attempt is not evidence that PostgreSQL was untouched. No schema/entity changes or deliberate data operations were introduced by this feature.

The launcher was corrected to force the H2 URL, driver, disposable credentials, test configuration, and loopback ports through its process environment, and to disable DevTools restart in the test-only Maven profile. Final verification passed: frontend lint/build, 40 backend tests and production packaging, 24 mocked responsive browser tests, and one actual HTTPS/H2 browser workflow. The production JAR was checked to exclude H2, the readiness controller, and mobile test configuration.
