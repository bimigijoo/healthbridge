import { test, expect } from "@playwright/test";

// Every API request is intercepted. These fixtures never touch the project database.
const worker = { id: 1, name: "Demo Worker", email: "worker@example.test", role: "WORKER" };
const profile = { id: 10, healthId: "HB-DEMO-001", bloodGroup: "O+", preferredLanguage: "English" };
const record = { id: 20, healthProfileId: 10, recordType: "CONSULTATION", recordDate: "2026-01-15", providerName: "Demo Provider", providerFacility: "Demo Clinic", reason: "Synthetic demonstration record" };

async function authenticate(page, user = worker) {
    await page.addInitScript(userData => {
        localStorage.setItem("healthbridge_token", "synthetic-test-session");
        localStorage.setItem("healthbridge_user", JSON.stringify(userData));
    }, user);
}

async function mockApi(page, { missingProfile = false, fail = false, emptyRecords = false, emptyClinical = false } = {}) {
    let hasProfile = !missingProfile;
    let recordList = emptyRecords ? [] : [record];
    let documents = emptyRecords ? [] : [{ id: 30, medicalRecordId: 20, fileName: "synthetic-report.pdf", fileType: "application/pdf" }];
    let sessions = [];
    let accounts = [{ ...worker, active: true }, { id: 2, name: "Demo Admin", email: "admin@example.test", role: "ADMIN", active: true }];
    await page.route("**/api/**", async route => {
        const request = route.request();
        const path = new URL(request.url()).pathname.replace("/api", "");
        const method = request.method();
        const json = (body, status = 200) => route.fulfill({ status, json: body });
        if (fail) return json({ message: "Synthetic service unavailable" }, 503);
        if (path === "/auth/register") return json(worker, 201);
        if (path === "/auth/login") return json({ message: "Invalid email or password." }, 401);
        if (path.startsWith("/health-profile/user/")) return hasProfile ? json(profile) : json({}, 404);
        if (path === "/health-profile" && method === "POST") { hasProfile = true; return json(profile, 201); }
        if (path.endsWith("/passport-link")) return json({ url: "https://demo.example.test/passport" +
            (new URL(request.url()).searchParams.get("includeReference") === "true" ? "#healthId=HB-DEMO-001" : "") });
        if (path.startsWith("/allergies/profile/")) return json(emptyClinical ? [] : [{ id: 1, allergen: "Synthetic allergy", reaction: "Synthetic reaction" }]);
        if (path.startsWith("/existing-conditions/profile/")) return json(emptyClinical ? [] : [{ id: 2, conditionName: "Synthetic chronic condition" }]);
        if (path.startsWith("/current-medications/profile/")) return json(emptyClinical ? [] : [{ id: 3, medicationName: "Synthetic medication", dosage: "Synthetic dose" }]);
        if (path.endsWith("/qr")) return route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX9sAAAAASUVORK5CYII=", "base64") });
        if (path === "/medical-records" && method === "POST") {
            const created = { id: 21, ...request.postDataJSON() };
            recordList.push(created);
            return json(created, 201);
        }
        if (path.startsWith("/medical-records/profile/")) return json(recordList);
        if (path.startsWith("/medical-documents/record/")) return json(documents.filter(document => document.medicalRecordId === Number(path.split("/").pop())));
        if (path.startsWith("/medical-documents/upload/")) {
            const document = { id: 31, medicalRecordId: Number(path.split("/").pop()), fileName: "new-report.pdf", fileType: "application/pdf" };
            documents.push(document);
            return json(document, 201);
        }
        if (path.endsWith("/download")) return route.fulfill({ contentType: "application/pdf", body: "%PDF-1.7 synthetic" });
        if (path.startsWith("/medical-documents/") && method === "DELETE") {
            documents = documents.filter(document => document.id !== Number(path.split("/").pop()));
            return route.fulfill({ status: 204 });
        }
        if (path.startsWith("/health-timeline/")) return json([{ id: 20, type: "MEDICAL_RECORD", title: "CONSULTATION", eventDate: "2026-01-15", description: "Synthetic demonstration record" }]);
        if (path.startsWith("/follow-ups/")) return json([]);
        if (path.startsWith("/sharing-sessions/profile/")) return json(sessions);
        if (path.startsWith("/sharing-sessions/") && path.endsWith("/qr")) {
            return route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX9sAAAAASUVORK5CYII=", "base64") });
        }
        if (path === "/sharing-sessions" && method === "POST") {
            const session = { id: 40, accessToken: "DEMO-ACCESS", medicalRecordIds: request.postDataJSON().medicalRecordIds,
                providerName: "Demo Provider", providerFacility: "Demo Clinic", expiresAt: "2099-01-01T00:00:00", createdAt: "2026-01-15T00:00:00", revoked: false };
            sessions.push(session);
            return json(session, 201);
        }
        if (path.startsWith("/sharing-sessions/") && method === "DELETE") {
            sessions = sessions.map(session => ({ ...session, revoked: true }));
            return route.fulfill({ status: 204 });
        }
        if (path === "/provider-access" || path.startsWith("/provider-access/")) {
            if (sessions.some(session => session.revoked)) return json({ message: "Access expired or revoked." }, 403);
            if (method === "POST") return json(record, 201);
            return json({ providerName: "Demo Provider", providerFacility: "Demo Clinic", expiresAt: "2099-01-01T00:00:00",
                medicalRecords: sessions.length ? recordList.filter(record => sessions[0].medicalRecordIds.includes(record.id)) : recordList });
        }
        if (path === "/admin/users") return json(accounts);
        if (path === "/admin/overview") return json({ totalAccounts: accounts.length,
            activeAccounts: accounts.filter(account => account.active).length,
            inactiveAccounts: accounts.filter(account => !account.active).length,
            workers: accounts.filter(account => account.role === "WORKER").length, admins: 1, healthProfiles: 1,
            sharingSessions: sessions.length, activeSessions: sessions.filter(session => !session.revoked).length,
            expiredSessions: 0, revokedSessions: sessions.filter(session => session.revoked).length,
            inactiveWorkerSessions: 0, recordViews: 0, consultationsAdded: 0, auditEventsLast24Hours: 0 });
        if (path.startsWith("/admin/users/") && method === "PATCH") {
            const id = Number(path.split("/")[3]);
            accounts = accounts.map(account => account.id === id ? { ...account, active: request.postDataJSON().active } : account);
            return json({ message: "Account status updated." });
        }
        throw new Error(`Unmocked API request: ${method} ${path}`);
    });
}

async function checkLayout(page) {
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    const clipped = await page.locator("button:visible, h1:visible, h2:visible").evaluateAll(elements =>
        elements.filter(element => element.scrollWidth > element.clientWidth + 2).map(element => element.tagName));
    expect(clipped).toEqual([]);
}

test("worker pages are responsive and retain navigation", async ({ page }, testInfo) => {
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await mockApi(page);
    await authenticate(page);
    for (const [path, heading] of [["/dashboard", "Overview"], ["/health-profile", "Health Profile"], ["/medical-records", "Medical Records"], ["/health-passport", "Digital Health Passport"], ["/health-timeline", "Health Timeline"], ["/share-records", "Share My Records"]]) {
        await page.goto(path);
        await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
        await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
        await checkLayout(page);
        await page.screenshot({ path: testInfo.outputPath(`${path.slice(1)}.png`), fullPage: true });
    }
    await page.goto("/admin");
    await expect(page).toHaveURL(/dashboard$/);
    expect(errors).toEqual([]);
});

test("registration returns to login and errors are accessible", async ({ page }) => {
    await mockApi(page);
    await page.goto("/register");
    await page.getByLabel("Full Name").fill("Demo Worker");
    await page.getByLabel("Email", { exact: true }).fill("worker@example.test");
    await page.getByLabel("Password", { exact: true }).fill("synthetic-password");
    await page.getByRole("button", { name: "Create Account", exact: true }).click();
    await expect(page).toHaveURL(/login$/);
    await expect(page.getByRole("status")).toHaveText("Account created. Sign in to continue.");
    await page.getByLabel("Email", { exact: true }).fill("worker@example.test");
    await page.getByLabel("Password", { exact: true }).fill("synthetic-password");
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("Invalid email or password");
    await checkLayout(page);
});

test("documents and consent sharing remain usable", async ({ page }) => {
    await mockApi(page);
    await authenticate(page);
    page.on("dialog", dialog => dialog.accept());
    await page.goto("/medical-records");
    await expect(page.getByText("synthetic-report.pdf", { exact: true })).toBeVisible();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download", exact: true }).click();
    expect((await downloadPromise).suggestedFilename()).toBe("synthetic-report.pdf");
    await page.locator('input[type="file"]').setInputFiles({ name: "new-report.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7 synthetic") });
    await expect(page.getByRole("status")).toContainText("uploaded successfully");
    await page.getByRole("button", { name: "Delete", exact: true }).last().click();
    await expect(page.getByRole("status")).toContainText("deleted successfully");
    await page.goto("/share-records");
    await page.getByRole("checkbox").first().check();
    await page.getByLabel("Provider Name", { exact: true }).fill("Demo Provider");
    await page.getByLabel("Authorize the provider to add a new consultation").check();
    await page.getByRole("button", { name: "Create Temporary Access" }).click();
    await expect(page.getByRole("heading", { name: "Temporary Access Created" })).toBeVisible();
    await page.goto("/provider-access");
    await page.getByText("Manual access code", { exact: true }).click();
    await page.getByLabel("Temporary Access Code", { exact: true }).fill("DEMO-ACCESS");
    await page.getByRole("button", { name: "Access Shared Records" }).click();
    await expect(page.getByRole("heading", { name: "Shared Medical Records" })).toBeVisible();
    await expect(page.locator(".ui-recordList")).toContainText("Synthetic demonstration record");
    await page.getByLabel("Reason for Consultation").fill("Synthetic consultation");
    await page.getByRole("button", { name: "Add Consultation", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Consultation added successfully");
    await checkLayout(page);
    await page.goto("/share-records");
    await page.getByRole("button", { name: "Revoke" }).last().click();
    await expect(page.locator(".ui-status")).toContainText("Revoked");
    await page.goto("/provider-access");
    await page.getByText("Manual access code", { exact: true }).click();
    await page.getByLabel("Temporary Access Code", { exact: true }).fill("DEMO-ACCESS");
    await page.getByRole("button", { name: "Access Shared Records" }).click();
    await expect(page.getByRole("alert")).toContainText("revoked");
});

test("profile-required and service-error states remain distinct", async ({ page }) => {
    await authenticate(page);
    await mockApi(page, { missingProfile: true });
    for (const path of ["/medical-records", "/health-timeline", "/share-records", "/health-passport"]) {
        await page.goto(path);
        await expect(page.getByRole("link", { name: "Create health profile", exact: true })).toBeVisible();
        await checkLayout(page);
    }
    await page.unroute("**/api/**");
    await mockApi(page, { fail: true });
    await page.goto("/medical-records");
    await expect(page.getByRole("alert")).toContainText("could not be loaded");
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});

test("admin tables and status actions are responsive", async ({ page }, testInfo) => {
    await mockApi(page);
    await authenticate(page, { id: 2, name: "Demo Admin", email: "admin@example.test", role: "ADMIN" });
    await page.goto("/admin");
    await expect(page.getByRole("table")).toBeVisible();
    await checkLayout(page);
    page.on("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: "Deactivate" }).click();
    await expect(page.locator(".success-message")).toContainText("Account status updated");
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.locator(".status-badge.inactive")).toHaveCount(1);
    await page.screenshot({ path: testInfo.outputPath("admin.png"), fullPage: true });
});

test("expired API sessions return the worker to login", async ({ page }) => {
    await authenticate(page);
    await page.route("**/api/**", route => route.fulfill({ status: 401, json: { message: "Session ended." } }));
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login$/);
    expect(await page.evaluate(() => localStorage.getItem("healthbridge_user"))).toBeNull();
});

test("camera-style QR link opens access automatically and removes the URL credential", async ({ page }) => {
    await mockApi(page);
    const requestPromise = page.waitForRequest(request => new URL(request.url()).pathname === "/api/provider-access");
    await page.goto("/provider-access#access=DEMO-ACCESS");
    const request = await requestPromise;
    await expect(page.getByRole("heading", { name: "Shared Medical Records", exact: true })).toBeVisible();
    expect(new URL(page.url()).hash === "").toBe(true);
    expect(new URL(request.url()).search === "").toBe(true);
    expect(request.headers()["authorization"]).toBeUndefined();
    await expect(page.getByLabel("Temporary Access Code")).toHaveCount(0);
});

test("login offers anonymous healthcare professional access", async ({ page }, testInfo) => {
    await mockApi(page);
    await page.goto("/login");
    await checkLayout(page);
    await page.screenshot({ path: testInfo.outputPath("provider-login-entry.png"), fullPage: true });
    await page.getByRole("link", { name: "Healthcare Professional - Access Shared Records" }).click();
    await expect(page).toHaveURL(/provider-access$/);
    await expect(page.getByRole("heading", { name: "Worker Authorization" })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("healthbridge_token"))).toBeNull();
    await checkLayout(page);
});

test("sharing QR retries without creating another consent session", async ({ page }) => {
    await mockApi(page);
    await authenticate(page);
    let qrAttempts = 0;
    let sessionsCreated = 0;
    page.on("request", request => {
        if (request.method() === "POST" && new URL(request.url()).pathname === "/api/sharing-sessions") sessionsCreated++;
    });
    await page.route("**/api/sharing-sessions/*/qr", route => {
        qrAttempts++;
        return qrAttempts === 1 ? route.fulfill({ status: 503, json: { message: "Unconfigured HTTPS origin" } })
            : route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX9sAAAAASUVORK5CYII=", "base64") });
    });
    await page.goto("/share-records");
    await page.getByLabel("Provider Name", { exact: true }).fill("Demo Provider");
    await page.getByLabel("Authorize the provider to add a new consultation").check();
    await page.getByRole("button", { name: "Create Temporary Access" }).click();
    await expect(page.getByRole("alert")).toContainText("public HTTPS");
    await page.getByRole("button", { name: "Retry sharing QR" }).click();
    await expect(page.getByAltText("Temporary provider access QR code")).toBeVisible();
    expect(qrAttempts).toBe(2);
    expect(sessionsCreated).toBe(1);
});

test("provider recheck removes records and consultation after revocation", async ({ page }) => {
    await mockApi(page);
    await page.goto("/provider-access#access=DEMO-ACCESS");
    await expect(page.getByRole("heading", { name: "Shared Medical Records", exact: true })).toBeVisible();
    await page.route("**/api/provider-access", route => route.fulfill({ status: 403, json: { message: "Access expired or revoked." } }));
    await page.getByRole("button", { name: "Recheck access" }).click();
    await expect(page.getByRole("alert")).toContainText("revoked");
    await expect(page.locator(".ui-recordList")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add Consultation", exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Temporary Access Code")).toHaveValue("");
    expect(await page.evaluate(() => Object.keys(localStorage).length + Object.keys(sessionStorage).length)).toBe(0);
});

test("invalid, expired, and revoked QR access shows a clean error page", async ({ page }) => {
    await page.route("**/api/**", route => route.fulfill({ status: 403,
        json: { message: "Sharing access is invalid, expired, or revoked." } }));
    for (const code of ["SYNTHETIC-INVALID", "SYNTHETIC-EXPIRED", "SYNTHETIC-REVOKED"]) {
        const response = page.waitForResponse(response => new URL(response.url()).pathname === "/api/provider-access");
        await page.goto(`/provider-access#access=${code}`);
        await response;
        await expect(page.getByRole("alert")).toContainText("expired, or revoked");
        expect(new URL(page.url()).hash === "").toBe(true);
        await expect(page.getByRole("heading", { name: "Shared Medical Records", exact: true })).toHaveCount(0);
    }
});

test("first worker creates a profile and uploads an independent report", async ({ page }, testInfo) => {
    await mockApi(page, { missingProfile: true, emptyRecords: true });
    await authenticate(page);
    await page.goto("/health-profile");
    await expect(page.getByLabel("Health ID", { exact: true })).toHaveCount(0);
    const request = page.waitForRequest(request => new URL(request.url()).pathname === "/api/health-profile" && request.method() === "POST");
    await page.getByRole("button", { name: "Create Health Profile", exact: true }).click();
    expect((await request).postDataJSON().healthId).toBeUndefined();
    await expect(page.getByText(profile.healthId, { exact: true })).toBeVisible();
    await page.goto("/medical-records");
    await expect(page.getByRole("heading", { name: "No medical records found" })).toBeVisible();
    await page.getByRole("button", { name: "Add Medical Record", exact: true }).click();
    await page.getByLabel("Record Type").selectOption("LAB_REPORT");
    await page.getByLabel("Reason / Report Title").fill("Synthetic existing report");
    await checkLayout(page);
    await page.screenshot({ path: testInfo.outputPath("new-record-form.png"), fullPage: true });
    await page.route("**/api/medical-records", route => route.fulfill({ status: 503, json: { message: "Synthetic save unavailable" } }));
    await page.getByRole("button", { name: "Save Medical Record" }).click();
    await expect(page.getByRole("alert")).toContainText("Synthetic save unavailable");
    await expect(page.getByLabel("Reason / Report Title")).toHaveValue("Synthetic existing report");
    await page.unroute("**/api/medical-records");
    await page.getByRole("button", { name: "Save Medical Record" }).click();
    await expect(page.getByRole("status")).toContainText("record saved");
    await page.locator('input[type="file"]').setInputFiles({ name: "new-report.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7 synthetic") });
    await expect(page.getByText("new-report.pdf", { exact: true })).toBeVisible();
    await checkLayout(page);
});

test("zero-record consultation consent is explicit and usable", async ({ page }) => {
    await mockApi(page, { emptyRecords: true });
    await authenticate(page);
    await page.goto("/share-records");
    await expect(page.getByRole("button", { name: "Create Temporary Access" })).toBeDisabled();
    await page.getByLabel("Provider Name", { exact: true }).fill("Demo Provider");
    await page.getByLabel("Authorize the provider to add a new consultation").check();
    const request = page.waitForRequest(request => new URL(request.url()).pathname === "/api/sharing-sessions" && request.method() === "POST");
    await page.getByRole("button", { name: "Create Temporary Access" }).click();
    expect((await request).postDataJSON()).toMatchObject({ medicalRecordIds: [], authorizeConsultation: true });
    await expect(page.getByAltText("Temporary provider access QR code")).toBeVisible();
    await page.goto("/provider-access#access=DEMO-ACCESS");
    await expect(page.getByText("No medical records were shared. This session authorizes a new consultation only.")).toBeVisible();
    await page.getByLabel("Reason for Consultation").fill("Synthetic first visit");
    await page.getByRole("button", { name: "Add Consultation", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Consultation added successfully");
    await checkLayout(page);
});

test("private passport reuses clinical data and its public reference exposes none", async ({ page }, testInfo) => {
    await mockApi(page);
    await authenticate(page);
    await page.addInitScript(() => {
        Object.defineProperty(navigator, "share", { value: async data => { window.passportSharedUrl = data.url; }, configurable: true });
        window.print = () => { window.passportPrinted = true; };
    });
    await page.goto("/health-passport");
    for (const text of ["Synthetic allergy", "Synthetic chronic condition", "Synthetic medication"]) {
        await expect(page.getByText(text, { exact: true })).toBeVisible();
    }
    await expect(page.getByLabel("Include Health ID in public QR")).not.toBeChecked();
    await expect(page.getByRole("button", { name: "Share Link" })).toBeEnabled();
    await page.getByRole("button", { name: "Share Link" }).click();
    expect(await page.evaluate(() => window.passportSharedUrl)).toBe("https://demo.example.test/passport");
    await page.getByLabel("Include Health ID in public QR").check();
    await expect(page.getByRole("button", { name: "Share Link" })).toBeEnabled();
    await page.getByRole("button", { name: "Share Link" }).click();
    expect(await page.evaluate(() => window.passportSharedUrl)).toBe("https://demo.example.test/passport#healthId=HB-DEMO-001");
    await page.getByRole("button", { name: "Print Passport" }).click();
    expect(await page.evaluate(() => window.passportPrinted)).toBe(true);
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: "Download QR" }).click();
    expect((await download).suggestedFilename()).toBe("healthbridge-passport-qr.png");
    await checkLayout(page);
    await page.screenshot({ path: testInfo.outputPath("private-passport.png"), fullPage: true });
    const apiCalls = [];
    page.on("request", request => { if (request.url().includes("/api/")) apiCalls.push(request.url()); });
    await page.goto("/passport#healthId=HB-DEMO-001");
    await expect(page.getByRole("heading", { name: "HealthBridge Passport Reference" })).toBeVisible();
    expect(new URL(page.url()).hash === "").toBe(true);
    expect(apiCalls).toEqual([]);
    for (const text of [worker.name, "Synthetic allergy", "Synthetic chronic condition", "Synthetic medication"]) {
        await expect(page.getByText(text, { exact: true })).toHaveCount(0);
    }
    await checkLayout(page);
    await page.screenshot({ path: testInfo.outputPath("public-passport.png"), fullPage: true });
});

test("passport empty clinical sections and unavailable QR stay distinct", async ({ page }) => {
    await mockApi(page, { emptyClinical: true });
    await authenticate(page);
    await page.route("**/api/health-profile/*/qr?*", route => route.fulfill({ status: 503, json: { message: "Unconfigured public origin" } }));
    await page.goto("/health-passport");
    await expect(page.getByText("No allergies recorded.")).toBeVisible();
    await expect(page.getByText("No conditions recorded.")).toBeVisible();
    await expect(page.getByText("No current medications recorded.")).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("configured public HTTPS");
    await expect(page.getByRole("button", { name: "Print Passport" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Share Link" })).toBeDisabled();
    await page.route("**/api/allergies/profile/*", route => route.fulfill({ status: 503, json: { message: "Synthetic unavailable" } }));
    await page.reload();
    await expect(page.getByText("Allergies could not be loaded.", { exact: false })).toBeVisible();
    await expect(page.getByText("No allergies recorded.")).toHaveCount(0);
});

test("provider begins with QR authorization and clears access when the session expires", async ({ page }) => {
    await mockApi(page);
    await page.clock.install({ time: new Date("2026-01-15T00:00:00Z") });
    await page.goto("/provider-access");
    await expect(page.getByRole("heading", { name: "Worker Authorization" })).toBeVisible();
    await expect(page.getByLabel("Temporary Access Code")).not.toBeVisible();
    await page.route("**/api/provider-access", route => route.fulfill({ json: { providerName: "Demo Provider",
        expiresAt: "2026-01-15T00:00:05Z", medicalRecords: [record] } }));
    await page.goto("/provider-access#access=DEMO-ACCESS");
    await expect(page.getByRole("heading", { name: "Shared Medical Records", exact: true })).toBeVisible();
    await page.clock.fastForward(6000);
    await expect(page.getByRole("alert")).toContainText("session has expired");
    await expect(page.getByRole("heading", { name: "Shared Medical Records", exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Temporary Access Code")).toHaveValue("");
    await expect(page.getByRole("button", { name: "Add Consultation", exact: true })).toHaveCount(0);
});

test("admin overview errors preserve account actions and successful retry shows real fixture counts", async ({ page }, testInfo) => {
    await mockApi(page);
    await authenticate(page, { id: 2, name: "Demo Admin", email: "admin@example.test", role: "ADMIN" });
    await page.route("**/api/admin/overview", route => route.fulfill({ status: 503, json: { message: "Synthetic overview unavailable" } }));
    await page.goto("/admin");
    await expect(page.getByRole("alert")).toContainText("Synthetic overview unavailable");
    await expect(page.getByRole("button", { name: "Deactivate", exact: true })).toBeVisible();
    await page.unroute("**/api/admin/overview");
    await page.getByRole("button", { name: "Retry overview" }).click();
    await expect(page.getByRole("heading", { name: "Recorded Consent Activity" })).toBeVisible();
    const metric = page.getByRole("region", { name: "Administration overview" }).locator(".metric").filter({ hasText: /^Workers/ });
    await expect(metric.locator("strong")).toHaveText("1");
    await checkLayout(page);
    await page.screenshot({ path: testInfo.outputPath("admin-overview.png"), fullPage: true });
});

test("an older admin overview response cannot replace a newer refresh", async ({ page }) => {
    await mockApi(page);
    await authenticate(page, { id: 2, name: "Demo Admin", email: "admin@example.test", role: "ADMIN" });
    let first;
    let requests = 0;
    await page.route("**/api/admin/overview", async route => {
        requests++;
        const response = { workers: 1, healthProfiles: 1, sharingSessions: 0, activeSessions: 0,
            expiredSessions: 0, revokedSessions: 0, inactiveWorkerSessions: 0, recordViews: 0,
            consultationsAdded: 0, auditEventsLast24Hours: requests };
        if (requests === 1) first = { route, response };
        else await route.fulfill({ json: response });
    });
    await page.goto("/admin");
    await expect(page.getByRole("button", { name: "Refresh", exact: true })).toBeEnabled();
    await expect.poll(() => !!first).toBe(true);
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    const events = page.locator(".admin-summary-grid div").filter({ hasText: "Audit events, last 24 hours" }).locator("dd");
    await expect(events).toHaveText("2");
    const olderResponse = page.waitForResponse(response => new URL(response.url()).pathname === "/api/admin/overview");
    await first.route.fulfill({ json: first.response });
    await (await olderResponse).finished();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(events).toHaveText("2");
});
