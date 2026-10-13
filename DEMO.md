# HealthBridge Demo

Use only invented names, `.test` email addresses, synthetic records, and synthetic documents. Keep account credentials, JWTs, and temporary access codes out of terminal output, screenshots, recordings, and presentation slides.

## Preparation

1. Run the frontend lint/build/browser checks and backend `verify` command in the root README.
2. For a manual demonstration, use an approved synthetic demo database with schema validation and SQL logging disabled. Never create demo patients in an existing patient database. Automated tests use H2 and separate build directories and do not require stopping the application on port 8080.
3. Start the frontend on port 5174. Use an existing authorized admin account for administration; public registration always creates a worker.
4. For an entirely isolated UI demonstration, run `npm run test:ui`. Its API fixtures cover the screens and workflows without contacting PostgreSQL. Successful screenshots are under the ignored `healthbridge-frontend/test-results` directory; passport tests use a placeholder image, not a real Health ID QR.

## Walkthrough

1. Register an invented worker, then sign in after the account-created message.
2. Create a health profile without supplying a Health ID. Verify the server-generated permanent ID; existing profiles retain their IDs.
   On the private passport, verify existing clinical entries or clear "not recorded" states. Its permanent QR opens the public reference page, never medical records. Health ID inclusion is off by default. Demonstrate Download QR, Share Link, and Print Passport without recording private health details.
3. Open Medical Records, choose Add Medical Record, and save a LAB REPORT or other appropriate record. A provider consultation is not required. The existing authenticated record API remains available.
4. Upload a synthetic PDF report. Download it, verify its filename, then delete the attachment with the existing confirmation control. Demonstrate an unsupported extension or oversized file being rejected.
5. Open the timeline, add an invented follow-up, and mark it complete. Show its completed state and chronological history.
6. Configure the approved public HTTPS frontend origin, select synthetic records if desired, and explicitly authorize a new provider consultation for 1 hour, 24 hours, or 7 days. An empty selection creates consultation-only access and exposes no records, including records created afterward. Keep the QR and fallback code private and out of recorded material.
7. Scan the sharing QR with the provider phone's default camera and open the offered URL. Records load without login or manual typing, and the credential disappears from the visible URL. Submit a synthetic consultation and check the worker timeline. The manual code remains an optional fallback.
8. Revoke the session. Confirm that Provider Access now rejects the code. The existing `GET /api/access-logs/session/{sessionId}` endpoint allows the owning worker to inspect the session's access log through an authenticated private request.
9. Sign in with the existing admin account. Demonstrate deactivating and reactivating a synthetic worker. An already-issued worker JWT must be rejected after deactivation.
   Check the read-only workspace/session/consent activity counts. Deactivated-worker sessions are excluded from active access. Only aggregates are shown; administrators gain no medical-record access.
10. Check navigation, forms, table scrolling, loading, missing-profile, and error states at mobile and desktop widths.

Example synthetic medical-record request body, replacing the profile ID with the demo worker's own ID:

```json
{
  "healthProfileId": 10,
  "recordType": "CONSULTATION",
  "recordDate": "2026-01-15",
  "providerName": "Demo Provider",
  "providerFacility": "Demo Clinic",
  "reason": "Synthetic demonstration record"
}
```

## Boundaries

Provider access is a temporary bearer capability. Provider identity supplied during sharing is not independently verified. The UI suite uses intercepted APIs; the separate live suite uses an actual loopback HTTPS frontend and Spring Boot/H2 backend. Physical default-camera scans, public HTTPS, and a PostgreSQL walkthrough remain separate acceptance checks. See [DEPLOYMENT.md](DEPLOYMENT.md). No schema migration is required by the QR feature.
