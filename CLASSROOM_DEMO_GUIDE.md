# HealthBridge Classroom Smartphone Demo

## Status and Safety

Checkpoints 5A and 5B are committed and pushed: 1b97d0c and 3c9fb69. Both existing QR generators require a configured public HTTPS origin. A localhost URL on a phone refers to that phone, not this laptop.

The classroom launcher runs this existing project with a **separate synthetic H2 in-memory database**, not PostgreSQL. The normal application on port 8080 must remain untouched. This demo is disposable: stopping its backend loses its accounts, records, sessions, and consultations. Use only invented names, test emails, synthetic clinical notes, and synthetic attachments. Do not reuse a real password.

| Component | Dedicated listener / configuration |
| --- | --- |
| Demo backend | 127.0.0.1:19080 |
| Compiled frontend and API proxy | 127.0.0.1:19443 |
| Datasource | jdbc:h2:mem:healthbridge_classroom_demo;MODE=PostgreSQL;DB_CLOSE_DELAY=-1 |
| JDBC driver | org.h2.Driver |
| Build output | backend target/classroom-demo-build; frontend dist-classroom |
| Uploaded synthetic files | backend target/classroom-demo-uploads |
| Public origin | CLASSROOM_PUBLIC_URL, set per terminal after approval |

The backend initializer checks the **effective** datasource, driver, credentials, profile, loopback binding, port, upload path, HTTPS origin, CORS, and quiet logging before datasource/JPA initialization. Non-H2 URLs, file-backed H2, additional profiles, and alternate Hikari/JNDI/SQL initialization overrides are refused. The launcher removes inherited Spring/JVM/Maven overrides and creates a random private JWT key without printing or saving it.

The frontend uses the built application, not the Vite development source server. It fixes API traffic to same-origin /api and proxies only to 127.0.0.1:19080. It ignores normal Vite config and .env files, permits the configured public hostname, uses a strict dedicated port, and sends no-store/no-referrer headers. No PostgreSQL port or database is tunneled.

## 1. Prepare Without Exposure

Run in PowerShell:

~~~powershell
Set-Location "C:\Users\bimig\OneDrive\Documents\Projects\healthbridge\healthbridge-frontend"
npm run test:demo-config
npm run demo:preflight
~~~

Preflight checks only dedicated ports; it never stops or reuses a listener. If a port is occupied, stop here and identify the process. Do not kill an unknown process or port 8080.

Prerequisites: existing frontend dependencies, Java 17, the repository Maven wrapper, and cloudflared from its [official installation instructions](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/). Installation and starting a public tunnel require user approval. Nothing here installs the tool or starts a tunnel automatically.

## 2. Obtain Approval and an HTTPS Address

**STOP: obtain explicit permission before the following network-exposure command.**

In a dedicated tunnel terminal, after approval:

~~~powershell
cloudflared tunnel --url http://127.0.0.1:19443
~~~

Keep this terminal running and note its generated HTTPS origin. Until the frontend starts, an origin connection error is expected. Do not target port 8080, 19080, or 5432. Do not use request/header/body debug logging or save a HAR containing credentials.

[Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) generate a temporary hostname, require no domain/account, and have no uptime guarantee. Anyone with the address can reach the public demo. The tunnel provider terminates public TLS and carries demo traffic; only synthetic data may pass through it. Do not add an email-authentication interstitial for this anonymous provider demonstration. Keep exposure short and close the tunnel immediately afterward.

## 3. Start the Separate Demo Backend

In a new PowerShell terminal:

~~~powershell
Set-Location "C:\Users\bimig\OneDrive\Documents\Projects\healthbridge\healthbridge-frontend"
$env:CLASSROOM_PUBLIC_URL = Read-Host "Paste the approved HTTPS origin, without a path"
npm run demo:backend
~~~

This launches the test-runtime-only classroom-demo profile through spring-boot:test-run. It never launches the normal PostgreSQL profile. Before startup, look for:

~~~text
Classroom isolation verified before datasource initialization: H2 in-memory, org.h2.Driver, backend 127.0.0.1:19080, matching configured HTTPS/CORS origin. PostgreSQL is not used.
~~~

If this line is absent or isolation is refused, stop. Do not substitute ordinary spring-boot:run or the normal application configuration.

Changing the public origin requires stopping and restarting **only this disposable demo backend**. It does not require restarting the existing backend on port 8080. Old demo accounts/sessions must be recreated after restart.

## 4. Start the Demo Frontend

In another PowerShell terminal, enter the **same** HTTPS origin:

~~~powershell
Set-Location "C:\Users\bimig\OneDrive\Documents\Projects\healthbridge\healthbridge-frontend"
$env:CLASSROOM_PUBLIC_URL = Read-Host "Paste the same approved HTTPS origin, without a path"
npm run demo:frontend
~~~

This builds into dist-classroom and starts the loopback preview/proxy on port 19443. It does not change the existing development server or API routing. Preview is for a short academic demonstration, not production hosting; see the [Vite preview options](https://vite.dev/config/preview-options.html).

In a separate check terminal:

~~~powershell
Invoke-RestMethod "http://127.0.0.1:19443/api/auth/demo-ready"
~~~

Expected: ready, H2, jdbc:h2:mem:healthbridge_classroom_demo, H2 JDBC Driver. Do not proceed if any value differs. Open the generated public HTTPS address on the laptop and confirm registration/login loads. No .env file or temporary URL needs to be committed.

## 5. Generate the Permanent Passport QR

1. On the laptop, use the **public demo address** and create a new synthetic worker account.
2. Sign in and create its health profile. The Health ID is generated automatically.
3. Open Health passport. The permanent passport QR should appear.
4. Keep Enable public emergency sharing off for the privacy-first demonstration. To demonstrate emergency disclosure, explicitly choose fields in Emergency Passport Settings and save.
5. Download QR saves its PNG. Print Passport includes the private summary and permanent QR; a print-to-PDF destination can save the passport. Printed private summaries contain health information, so use only synthetic data.

This QR opens /passport with a random reference, never clinical values or a Health ID credential. Public sharing is disabled by default; when enabled, only the saved selected emergency fields are returned. A permanent QR grants no full medical-record or consultation access and is not identity verification. Legacy Health ID links remain nondisclosing. See [EMERGENCY_PASSPORT.md](EMERGENCY_PASSPORT.md). A temporary tunnel address is not permanent infrastructure: old printed QRs stop working when that address disappears.

## 6. Scan the Passport on the Smartphone

**Physical acceptance step: do one action at a time and report the result before continuing.**

Use the phone default camera to scan the permanent QR on the laptop, then tap its HTTPS link. No HealthBridge installation or login should be requested. With sharing off, confirm the privacy message and no clinical information. Then enable only synthetic allergies, save, and rescan: only that selected field should appear. Revoke and rescan: no emergency disclosure. Names, DOB, private notes, medical records, and consultation history must never appear.

If the optional reference was enabled, its text should be labeled unverified. The fragment is cleared from the visible browser URL.

## 7. Generate and Scan Temporary Sharing

1. On the laptop, create two synthetic medical records with visibly different reasons.
2. Open Consent & sharing, select **only one** record, enter an invented provider name, and choose one hour.
3. Explicitly authorize a new consultation and create temporary access.
4. Confirm the sharing QR, expiry, and revoke action appear. The manual code remains a fallback, not the primary flow.
5. On the phone, use its default camera to scan the **temporary sharing QR**, then tap the HTTPS link.
6. Confirm Provider Access opens without logging in and displays only the selected record.
7. Optionally submit a synthetic consultation. Confirm success on the phone and the new consultation in the laptop worker timeline.

The temporary QR contains only /provider-access#access=<unpredictable-temporary-code>. The page clears the fragment before API validation and retains the credential only in memory. Every API read and consultation write rechecks active consent. Reloading loses the credential by design; rescan while authorized rather than storing it in browser storage.

## 8. Revoke Access

On the laptop, revoke the sharing session. On the open phone provider page, tap Recheck access: it must display invalid/expired/revoked access and remove the records/form. Refresh the phone page: previously loaded medical information must be gone. Rescan the original sharing QR: the backend must deny access. Consultation submission after revocation must also fail.

Revocation cannot recall screenshots or information already read. Anyone holding the QR/code can use its permission until expiry/revocation; provider identity is self-reported, not verified.

## 9. Troubleshooting

| Symptom | Check |
| --- | --- |
| QR requires a public HTTPS address | Make sure this browser uses the demo instance, not the existing backend on 8080. Check identical CLASSROOM_PUBLIC_URL values in both demo terminals. Restart only the disposable demo when its URL changes. |
| Phone opens localhost or cannot connect | QR must use the generated public HTTPS address. Do not use localhost, LAN-only links, or the self-signed automated-test server on 18443. |
| Tunnel origin error / 502 | Keep all three demo terminals running. Confirm /api/auth/demo-ready through 19443. No firewall rule or database exposure is needed. |
| Host is blocked | Ensure the frontend was started with the current approved hostname, not a previous tunnel address. Never set allowedHosts to true. |
| API/CORS error | Use same-origin /api; do not configure a browser API URL containing localhost. Backend CORS must match the generated HTTPS origin. |
| Manual provider page after refresh | Expected: credential is not persisted. Rescan the authorized QR. After revocation, rescanning must be denied. |
| QR scan is difficult | Increase laptop brightness/zoom, preserve the white quiet zone, and move the camera slightly back. Test the actual default camera, not a HealthBridge scanner. |
| Browser TLS warning | Stop. The phone needs the trusted public tunnel certificate, not a self-signed local test certificate. |
| Test port occupied | Abort without terminating unknown processes. Check only dedicated demo ports. |
| Account vanished | H2 demo data resets when the demo backend stops. Recreate synthetic demo data; do not switch to PostgreSQL as a shortcut. |

## 10. Shut Down Safely

1. Close the tunnel first with Ctrl+C in its own terminal.
2. Sign out the synthetic worker and close the phone browser tab.
3. Ctrl+C in the dedicated demo frontend terminal.
4. Ctrl+C in the dedicated demo backend terminal. Only its H2 memory database is disposed.
5. Run npm run demo:preflight again to confirm dedicated ports are free. If not, inspect the remaining demo process; do not use broad process-kill commands.

No database reset/delete command is needed. Synthetic uploaded files may remain in the ignored demo upload directory. Do not delete production uploads or PostgreSQL data.

## Verification Boundaries

- test:demo-config and backend guard tests inspect configuration and unsafe override rejection.
- test:classroom uses the actual demo launchers, Vite preview proxy, Spring security, H2, and mobile-sized browser. It simulates the public origin and substitutes loopback transport; it does **not** create a tunnel or prove public TLS/phone access. No API mocking is used.
- test:live uses actual loopback HTTPS/Spring/H2, but its self-signed local certificate is not phone deployment.
- Only the approved tunnel plus separate smartphone/default-camera workflow proves classroom reachability. Record its actual results before marking Checkpoint 5C complete, committing, and pushing it.
