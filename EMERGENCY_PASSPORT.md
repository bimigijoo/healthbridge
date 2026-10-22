# Permanent Emergency Health Passport

## Architecture and Changes

HealthBridge remains a React/Vite frontend, Spring Boot 4 / Java 17 backend, JWT worker/admin authentication, and PostgreSQL application. Render's existing multistage Dockerfile packages the backend; no deployment was performed. Existing temporary provider sharing, consultation submission, medical records, uploads, and account management remain separate.

The authenticated Digital Health Passport now contains persistent Emergency Passport Settings and allergy, condition, and medication add/edit/delete forms using the existing clinical entities. Profile editing continues to manage blood group, emergency contact, and language.

New settings are stored in one additive emergency_passport_preferences table. Existing profiles require no backfill: a missing row means disabled. The first owner settings/link request creates a disabled row with a 32-byte cryptographically random, 43-character Base64url reference. The reference remains stable until replaced. Preferences are loaded from the database on every session, not from browser storage.

Workers independently select six categories. All selected categories reflect current saved information, including future additions. Public values are limited to blood group, emergency contact, preferred language, allergy names/reactions, condition names, and medication names/dosage/frequency. Private names, DOB, Health ID, internal IDs, diagnosis dates, notes, records, documents, and consultations are not serialized.

## APIs and QR Flow

Owner-only APIs (worker JWT and profile ownership required):

- GET /api/emergency-passport/profile/{id}: saved preferences.
- PUT /api/emergency-passport/profile/{id}: complete seven-boolean settings payload (enabled plus the six category keys).
- POST /api/emergency-passport/profile/{id}/regenerate: replace reference; preserve saved preferences.
- GET /api/emergency-passport/profile/{id}/link and /qr: HTTPS link / PNG, no-store.

Public access is **GET only** at /api/public/emergency-passport, with X-HealthBridge-Passport-Reference. There is no public worker ID lookup, mutation API, or permanent-QR consultation authorization. Invalid, disabled, replaced, and inactive-account references all return the same empty 404/no-store response.

1. Worker signs in, saves clinical information, enables sharing, selects categories, and saves preferences once.
2. Permanent QR contains https://<configured-origin>/passport#reference=<random-reference>, never medical values or JWTs.
3. A normal phone camera opens that HTTPS link without login or installation.
4. The browser removes the fragment with history.replaceState, retaining it only in component memory. A separate public Axios client sends it in the dedicated header, never as a query/path or permanent JWT.
5. Only selected information is displayed. Each new read validates enabled status and account activity. The viewer clears displayed data before revalidation, on errors, and on denial; it revalidates every 30 seconds and when returning to the page.
6. Disable stops subsequent server disclosure; re-enable restores access to the same reference. Replace invalidates old copies permanently and updates the worker's QR. Existing screenshots cannot be recalled.

Refreshing a cleaned public URL intentionally loses the reference; scan/open the original link again. Legacy /passport#healthId=... links remain nondisclosing unverified references, not authorization. Legacy /api/health-profile/{id}/qr is retained for compatibility; the worker UI uses the new emergency QR APIs.

The restricted PostgreSQL review gateway adds only the exact read-only public API above. It forwards only its dedicated credential and strips JWTs, cookies, and temporary consent headers. Authentication, registration, admin, worker settings, clinical management, document, and record endpoints remain blocked publicly. Temporary /api/provider-access and /api/provider-access/consultation keep their separate existing consent authorization.

## Migration and Render Rollout (Approval Required)

There is no Flyway/Liquibase or other migration runner in this repository. Do not introduce automatic baselining into an existing database. The reviewed manual additive script is:

    healthbridge-backend/database/migrations/001_emergency_passport_preferences.sql

It creates only the preferences table and its foreign key/unique reference constraint. It contains no UPDATE, DELETE, DROP, or old-table ALTER. All flags default false and no existing profile is opted in. The table stores only sharing preferences/references, not copied clinical data. It deliberately fails if the table already exists; inspect the existing schema rather than reapplying blindly.

The normal backend configuration now uses spring.jpa.hibernate.ddl-auto=validate. A missing or incompatible table must stop startup, not silently trigger schema changes. H2 test/classroom profiles retain their own isolated create-drop settings. Do not set update, create, or create-drop on PostgreSQL.

After separate explicit approval, the operator should:

1. Review and back up the approved database privately; rehearse migration and validation on an isolated PostgreSQL staging copy. H2 tests are not proof of production PostgreSQL migration compatibility.
2. Ensure the database is private and the runtime role has only the permissions needed; use a separate privileged operator for the one-time DDL.
3. Apply the script through the private database tool. With libpq credentials already securely configured, from repository root:

       psql -X --set ON_ERROR_STOP=1 --file healthbridge-backend/database/migrations/001_emergency_passport_preferences.sql

   This command is for operator review, not executed here. It uses psql's operator-configured database, so verify the selected host/database privately first; never paste credentials or connection strings into commands/output.
4. Configure Render secrets using the existing DB_URL, DB_USERNAME, DB_PASSWORD, and JWT_SECRET. Do not replace existing account passwords, rotate working secrets unnecessarily, or enable admin bootstrap. Preserve PORT supplied by Render.
5. Explicitly set SPRING_JPA_HIBERNATE_DDL_AUTO=validate, SPRING_SQL_INIT_MODE=never, and HEALTHBRIDGE_ADMIN_BOOTSTRAP_ENABLED=false for the rollout. Abort on schema mismatch and investigate privately.
6. Set PUBLIC_FRONTEND_BASE_URL to the stable, publicly trusted HTTPS frontend origin only (no path, fragment, query, or credentials). A changing quick-tunnel address makes printed QR links obsolete. No new secret is required for passports.
7. Set CORS_ALLOWED_ORIGINS to exact approved frontend origins. Spring permits the new passport header. Do not use a wildcard; CORS is not authorization.
8. Build frontend with npm ci then npm run lint and npm run build. Use same-origin /api reverse proxy, or build with VITE_API_BASE_URL=https://<approved-backend>/api. Never place secrets in Vite variables. Configure SPA fallback for /passport and /provider-access.
9. Deploy the existing Dockerfile only after tests pass. It uses -DskipTests during image build, so CI verification remains necessary. The migration file is intentionally not an auto-executed image startup script.
10. Disable caching/analytics/service workers on sensitive pages/APIs, set Referrer-Policy: no-referrer, redact credential headers and bodies at all proxies, restrict API reachability, and add deployment-edge rate limits. Keep PostgreSQL port 5432 private.
11. Repeat the manual checks below with synthetic data on the approved public origin. Check existing upload persistence separately: the current container-relative upload directory is not durable without a persistent volume.

For the approved-but-not-started local provider-only gateway, after schema rollout and backend configuration approval: set PUBLIC_FRONTEND_BASE_URL in the gateway terminal to the approved HTTPS origin and run npm run review:public from healthbridge-frontend. It binds 127.0.0.1:19444, proxies only approved APIs to existing 127.0.0.1:8080, and does not start Spring or Cloudflare. Do not start a tunnel until separately approved. The private worker UI must use the separately accessible authenticated application, not the restricted gateway.

Rollback: disable public exposure and use a previously verified application artifact if needed. Leave the additive table and all accounts/records intact; do not drop data or run reverse/destructive migrations. Keep PostgreSQL startup validation-only during rollback. References printed after rollout will not show emergency data on the legacy frontend.

## Verification Commands

Frontend: npm run lint, npm run build, npm run test:ui, npm run test:review-gateway.

Backend, using isolated H2 test configuration and HEALTHBRIDGE_ADMIN_BOOTSTRAP_ENABLED=false:

    .\mvnw.cmd "-Dmaven.repo.local=target/.m2/repository" "-Dhealthbridge.build.directory=target/checkpoint-verification" verify -B -ntp

Live: npm run test:live:preflight, then npm run test:live with permission. These require dedicated free loopback ports 18080 (Spring/H2) and 18443 (local HTTPS), reject non-H2 or unexpected datasource overrides before bean creation, disable admin bootstrap, verify actual H2 metadata/CORS, and use synthetic data only. They never use PostgreSQL or port 8080.

Mocked responsive UI tests prove UI behavior, not real server access. Gateway tests use a synthetic loopback upstream/TLS fixture. Live tests use real Spring/H2/HTTPS browser requests and actual QR decoding, not API mocks. None prove actual phone-camera/public Render access; that needs an approved staging deployment with a trusted certificate.

## Manual Verification Checklist

- Existing and newly registered workers start with all public sharing disabled.
- Add/edit/delete an allergy, condition and medication; check authenticated passport and validate ownership across two synthetic workers.
- Enable one field, save, sign out/in, and confirm settings persist.
- Scan the new printed QR using the phone's default camera. Verify automatic public page, no login, cleared URL fragment, no unselected fields/name/DOB/notes/history.
- Enable remaining categories one at a time and verify nested field filtering, empty categories, and subsequent source updates.
- Revoke while the phone page is open, recheck after focus/30 seconds, and scan again. No further API disclosure; old screenshots remain outside application control.
- Re-enable and replace the reference. Old QR must fail; newly downloaded QR must work.
- Deactivate the synthetic account; public access must stop.
- Try anonymous settings writes and another worker's IDs: denied. Try permanent reference as provider code: record/consultation access denied.
- Repeat temporary consent QR, selected-record filtering, consultation submission/timeline, expiry, and revocation. Repeat admin sign-in/account management and worker registration/login.
- Check mobile/tablet/desktop layouts, slow/offline server errors/retry, no cached disclosure after denial, and no secrets/headers in logs.

## Limitations

This is deliberately anonymous bearer-reference access to selected health information. It is not verified identity, a provider credential, or a clinical decision system. Anyone with a copy can read selected fields while enabled; source text may itself contain information entered by the worker. No finite expiry is imposed on permanent references. A compromised reference requires rotation. Revocation cannot undo delivered responses, screenshots, printed private passports, or information retained by a viewer. Enforce HTTPS, edge rate limits, log redaction, and synthetic demo data; avoid third-party resources on these pages. Do not share real private records through a classroom tunnel.

## Verification Results (2026-10-22)

- npm run lint: passed, no errors.
- npm run build: passed (Vite production build).
- Maven verify: 74 tests, zero failures/errors/skips; packaged successfully. H2 in-memory only, explicit H2 driver, admin bootstrap disabled, isolated target/checkpoint-verification output.
- npm run test:ui: 69 passed across desktop, tablet and mobile. All APIs mocked; includes settings persistence/revocation/rotation, all three clinical CRUD forms, error retry, repeat-reference rescans, and existing admin/worker/temporary-provider workflows.
- npm run test:review-gateway: 9 passed. Synthetic loopback HTTP/TLS upstream only; verifies exact allowlists, read-only passport access, per-route credential forwarding, blocked private APIs, CORS and browser rendering. No PostgreSQL backend connection.
- npm run test:live: 4 passed with actual Spring/H2, local HTTPS, real API calls and decoded QR images, without API mocks. Verified emergency settings persistence, selected-only anonymous information, clinical editing, revocation, reference rotation, denied permanent-reference consultations, and existing temporary QR consultation/timeline/revocation and document workflows.
- Datasource for live tests: jdbc:h2:mem:healthbridge_mobile_e2e, H2 JDBC Driver; backend 127.0.0.1:18080 and HTTPS/CORS https://localhost:18443. Pre-initialization guard rejects non-H2 and unsupported datasource overrides.
- git diff --check passed. No files staged, committed, or pushed. Existing unrelated changes retained.

The first actual live run found a repeat-reference hash-navigation loading bug; it was fixed and covered by a regression test. Initial sandboxed browser/gateway attempts were denied loopback network access and were rerun with permission; those denied attempts are not counted as successful tests.

No original PostgreSQL data/schema, existing services, Render settings, or public tunnel were accessed or modified. The manual migration was syntax/defaults tested in isolated H2 PostgreSQL mode, not applied to PostgreSQL. Real-phone camera recognition, trusted public TLS, PostgreSQL staging migration/schema validation, Render rollout and production log/rate-limit policy still need separate approval and verification.

## Changed Components

- Backend: new EmergencyPassportPreferences entity/repository, EmergencyPassportService, EmergencyPassportController, request/settings DTOs, owner-profile locking, HTTPS emergency link generation, exact public GET security/CORS header.
- Clinical APIs: existing allergy/condition/medication controllers gain owned PUT endpoints; request DTOs gain length/positive-ID/date validation.
- Runtime safety: application.properties changes schema auto-update to validate; live test config/guard explicitly disable the newly introduced admin bootstrap.
- Frontend: EmergencyPassportSettings and ClinicalRecordsSection, HealthPassportPage, PassportQr, PublicPassportPage, and two scoped responsive CSS rules.
- Gateway: review-postgres-public.js and its tests add only the read-only emergency endpoint.
- Tests: EmergencyPassportIntegrationTest, EmergencyPassportMigrationTest, workflows.spec.js, mobile-qr.spec.js and live-isolation configuration.
- Documentation: this guide, README.md, DEPLOYMENT.md and updated emergency-QR instructions in CLASSROOM_DEMO_GUIDE.md. Earlier checkpoint/classroom launcher changes remain intact.
