# HealthBridge Demo

Use only invented names, `.test` email addresses, synthetic records, and synthetic documents. Keep account credentials, JWTs, and temporary access codes out of terminal output, screenshots, recordings, and presentation slides.

## Preparation

1. Run the frontend lint/build/browser checks and backend `verify` command in the root README.
2. Start the backend with schema validation and SQL logging disabled, using the existing database and securely supplied environment variables.
3. Start the frontend on port 5174. Use an existing authorized admin account for administration; public registration always creates a worker.
4. For an entirely isolated UI demonstration, run `npm run test:ui`. Its API fixtures cover the screens and workflows without contacting PostgreSQL. Successful screenshots are under the ignored `healthbridge-frontend/test-results` directory; passport tests use a placeholder image, not a real Health ID QR.

## Walkthrough

1. Register an invented worker, then sign in after the account-created message.
2. Create a health profile with an invented Health ID such as `HB-DEMO-001`. View the passport and verify that its QR contains only the Health ID representation.
3. Use an existing synthetic medical record owned by that worker. If none exists, create one through the existing `POST /api/medical-records` endpoint using an authenticated Postman request. Store its JWT privately in a local, unsynced environment; do not export that environment.
4. Upload a synthetic PDF report. Download it, verify its filename, then delete the attachment with the existing confirmation control. Demonstrate an unsupported extension or oversized file being rejected.
5. Open the timeline, add an invented follow-up, and mark it complete. Show its completed state and chronological history.
6. Share a selected synthetic record with an invented provider for one of the existing durations: 1 hour, 24 hours, or 7 days. Transfer the access code privately, outside the recorded demo.
7. Open Provider Access, retrieve the selected records, and submit a synthetic consultation. Return to the worker's medical records to see the consultation.
8. Revoke the session. Confirm that Provider Access now rejects the code. The existing `GET /api/access-logs/session/{sessionId}` endpoint allows the owning worker to inspect the session's access log through an authenticated private request.
9. Sign in with the existing admin account. Demonstrate deactivating and reactivating a synthetic worker. An already-issued worker JWT must be rejected after deactivation.
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

Provider access is a temporary bearer capability. Provider identity supplied during sharing is not independently verified. The browser tests use intercepted APIs; backend integration tests use H2 and the actual Spring security chain. A live PostgreSQL walkthrough remains a separate manual check. No existing patient information or database schema was changed to prepare this demo.
