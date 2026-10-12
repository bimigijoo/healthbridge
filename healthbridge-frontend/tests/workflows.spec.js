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

async function mockApi(page, { missingProfile = false, fail = false } = {}) {
    let documents = [{ id: 30, medicalRecordId: 20, fileName: "synthetic-report.pdf", fileType: "application/pdf" }];
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
        if (path.startsWith("/health-profile/user/")) return missingProfile ? json({}, 404) : json(profile);
        if (path.endsWith("/qr")) return route.fulfill({ contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX9sAAAAASUVORK5CYII=", "base64") });
        if (path.startsWith("/medical-records/profile/")) return json([record]);
        if (path.startsWith("/medical-documents/record/")) return json(documents);
        if (path.startsWith("/medical-documents/upload/")) {
            const document = { id: 31, medicalRecordId: 20, fileName: "new-report.pdf", fileType: "application/pdf" };
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
            const session = { id: 40, accessToken: "DEMO-ACCESS", providerName: "Demo Provider", providerFacility: "Demo Clinic", expiresAt: "2099-01-01T00:00:00", createdAt: "2026-01-15T00:00:00", revoked: false };
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
            return json({ providerName: "Demo Provider", providerFacility: "Demo Clinic", expiresAt: "2099-01-01T00:00:00", medicalRecords: [record] });
        }
        if (path === "/admin/users") return json(accounts);
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
    await page.getByRole("button", { name: "Create Temporary Access" }).click();
    await expect(page.getByRole("heading", { name: "Temporary Access Created" })).toBeVisible();
    await page.goto("/provider-access");
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
