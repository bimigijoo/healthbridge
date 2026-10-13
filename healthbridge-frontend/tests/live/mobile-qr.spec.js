import { test, expect } from "@playwright/test";
import { PNG } from "pngjs";
import jsQR from "jsqr";

async function registerWorker(page) {
    const readiness = await page.request.get("/api/auth/e2e-ready");
    expect(readiness.ok()).toBe(true);
    expect(await readiness.json()).toEqual({ status: "ready", database: "H2",
        jdbcUrl: "jdbc:h2:mem:healthbridge_mobile_e2e", driver: "H2 JDBC Driver" });
    const cors = await page.request.fetch("/api/provider-access/consultation", {
        method: "OPTIONS", headers: { Origin: "https://localhost:18443",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-healthbridge-access-code,idempotency-key" },
    });
    expect(cors.ok()).toBe(true);
    expect(cors.headers()["access-control-allow-origin"]).toBe("https://localhost:18443");
    const email = `synthetic-${crypto.randomUUID()}@example.test`;
    const password = "synthetic-local-test-password";
    await page.goto("/register");
    await page.getByLabel("Full Name").fill("Synthetic Mobile Worker");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    const registration = page.waitForResponse(response => new URL(response.url()).pathname === "/api/auth/register");
    await page.getByRole("button", { name: "Create Account", exact: true }).click();
    expect((await registration).status()).toBe(201);
    await expect(page).toHaveURL(/login$/);
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(page).toHaveURL(/dashboard$/);
    await page.goto("/health-profile");
    await expect(page.getByLabel("Health ID", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Create Health Profile", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Digital Health Profile", exact: true })).toBeVisible();
    const auth = await page.evaluate(() => ({ token: localStorage.getItem("healthbridge_token"), user: JSON.parse(localStorage.getItem("healthbridge_user")) }));
    const headers = { Authorization: `Bearer ${auth.token}` };
    const profileResponse = await page.request.get(`/api/health-profile/user/${auth.user.id}`, { headers });
    expect(profileResponse.ok()).toBe(true);
    const profile = await profileResponse.json();
    expect(/^HB-[0-9a-f-]{36}$/.test(profile.healthId)).toBe(true);
    return { profile, headers };
}

test("real HTTPS QR access, consultation persistence, timeline, and revocation", async ({ page, browser }) => {
    const { profile, headers } = await registerWorker(page);
    // Create records through the existing authenticated worker API; all calls use the real backend.
    for (const reason of ["Authorized synthetic record", "Unshared synthetic record"]) {
        const response = await page.request.post("/api/medical-records", { headers, data: {
            healthProfileId: profile.id, recordType: "CONSULTATION", recordDate: "2026-01-15",
            providerName: "Demo Provider", reason,
        } });
        expect(response.status()).toBe(201);
    }
    await page.goto("/share-records");
    await page.getByRole("checkbox").first().check();
    await page.getByLabel("Provider Name", { exact: true }).fill("Demo Provider");
    await page.getByLabel("Authorize the provider to add a new consultation").check();
    const qrResponsePromise = page.waitForResponse(response => /\/sharing-sessions\/\d+\/qr$/.test(response.url()) && response.status() === 200);
    await page.getByRole("button", { name: "Create Temporary Access" }).click();
    const qrResponse = await qrResponsePromise;
    await expect(page.getByAltText("Temporary provider access QR code")).toBeVisible();
    const png = PNG.sync.read(await qrResponse.body());
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(!!decoded).toBe(true);
    const link = new URL(decoded.data);
    expect(link.origin === "https://localhost:18443").toBe(true);
    expect(link.pathname === "/provider-access").toBe(true);
    expect(link.search === "").toBe(true);
    expect(!link.href.includes(profile.healthId)).toBe(true);

    const providerContext = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 } });
    try {
        const provider = await providerContext.newPage();
        await provider.goto(link.href);
        await expect(provider.getByRole("heading", { name: "Shared Medical Records", exact: true })).toBeVisible();
        expect(new URL(provider.url()).hash === "").toBe(true);
        expect(await provider.evaluate(() => localStorage.getItem("healthbridge_token"))).toBeNull();
        expect(await provider.locator(".ui-recordItem").count()).toBe(1);
        await expect(provider.getByLabel("Temporary Access Code")).toHaveCount(0);
        await provider.getByLabel("Reason for Consultation").fill("Synthetic QR consultation saved by provider");
        await provider.getByRole("button", { name: "Add Consultation", exact: true }).click();
        await expect(provider.getByRole("status")).toContainText("Consultation added successfully");
        await expect(provider.getByRole("button", { name: "Add Consultation", exact: true })).toHaveCount(0);
        expect(await provider.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await page.goto("/health-timeline");
        await expect(page.locator(".ui-timeline")).toContainText("Synthetic QR consultation saved by provider");
        await page.goto("/share-records");
        await page.getByRole("button", { name: "Revoke Access", exact: true }).last().click();
        await expect(page.locator(".ui-status")).toContainText("Revoked");
        await provider.goto(link.href);
        await expect(provider.getByRole("alert")).toContainText("revoked");
        expect(new URL(provider.url()).hash === "").toBe(true);
        await expect(provider.getByRole("heading", { name: "Shared Medical Records", exact: true })).toHaveCount(0);
        const code = new URLSearchParams(link.hash.slice(1)).get("access");
        const denied = await provider.request.post("/api/provider-access/consultation", {
            headers: { "X-HealthBridge-Access-Code": code, "Idempotency-Key": crypto.randomUUID() },
            data: { recordDate: "2026-01-15", providerName: "Demo Provider", reason: "Synthetic denied consultation" },
        });
        expect(denied.status()).toBe(403);
    } finally { await providerContext.close(); }
});

test("first-time worker uploads an existing report without a consultation", async ({ page }) => {
    const { profile, headers } = await registerWorker(page);
    await page.goto("/medical-records");
    await expect(page.getByRole("heading", { name: "No medical records found" })).toBeVisible();
    await page.getByRole("button", { name: "Add Medical Record", exact: true }).click();
    await page.getByLabel("Record Type").selectOption("LAB_REPORT");
    await page.getByLabel("Reason / Report Title").fill("Synthetic archived report");
    await page.getByRole("button", { name: "Save Medical Record" }).click();
    await expect(page.getByRole("status")).toContainText("record saved");
    await page.locator('input[type="file"]').setInputFiles({ name: "synthetic-existing-report.pdf",
        mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7\nsynthetic archived report") });
    await expect(page.getByText("synthetic-existing-report.pdf", { exact: true })).toBeVisible();
    const response = await page.request.get(`/api/medical-records/profile/${profile.id}`, { headers });
    expect(response.ok()).toBe(true);
    const records = await response.json();
    expect(records.length).toBe(1);
    expect(records[0].recordType).toBe("LAB_REPORT");
    const docs = await page.request.get(`/api/medical-documents/record/${records[0].id}`, { headers });
    expect(docs.ok()).toBe(true);
    const attachments = await docs.json();
    expect(attachments.length).toBe(1);
    const downloaded = await page.request.get(`/api/medical-documents/${attachments[0].id}/download`, { headers });
    expect(downloaded.ok()).toBe(true);
    expect((await downloaded.body()).toString().startsWith("%PDF-")).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test("zero-record consultation-only QR produces the worker's first consultation", async ({ page, browser }) => {
    const { profile, headers } = await registerWorker(page);
    await page.goto("/share-records");
    await expect(page.getByText("No records yet.", { exact: false })).toBeVisible();
    await page.getByLabel("Provider Name", { exact: true }).fill("Synthetic Provider");
    await page.getByLabel("Authorize the provider to add a new consultation").check();
    const qr = page.waitForResponse(response => /\/sharing-sessions\/\d+\/qr$/.test(response.url()) && response.status() === 200);
    await page.getByRole("button", { name: "Create Temporary Access" }).click();
    const png = PNG.sync.read(await (await qr).body());
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(!!decoded).toBe(true);
    const link = new URL(decoded.data);
    expect(link.origin === "https://localhost:18443").toBe(true);
    const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 } });
    try {
        const provider = await context.newPage();
        await provider.goto(link.href);
        await expect(provider.getByText("No medical records were shared. This session authorizes a new consultation only.")).toBeVisible();
        expect(new URL(provider.url()).hash === "").toBe(true);
        expect(await provider.evaluate(() => localStorage.getItem("healthbridge_token"))).toBeNull();
        await provider.getByLabel("Reason for Consultation").fill("Synthetic first provider consultation");
        await provider.getByRole("button", { name: "Add Consultation", exact: true }).click();
        await expect(provider.getByRole("status")).toContainText("Consultation added successfully");
        const code = new URLSearchParams(link.hash.slice(1)).get("access");
        const access = await provider.request.get("/api/provider-access", { headers: { "X-HealthBridge-Access-Code": code } });
        expect(access.ok()).toBe(true);
        expect((await access.json()).medicalRecords.length).toBe(0);
        await page.goto("/health-timeline");
        await expect(page.locator(".ui-timeline")).toContainText("Synthetic first provider consultation");
        const records = await page.request.get(`/api/medical-records/profile/${profile.id}`, { headers });
        expect((await records.json()).length).toBe(1);
        await page.goto("/share-records");
        await page.getByRole("button", { name: "Revoke Access", exact: true }).last().click();
        await expect(page.locator(".ui-status")).toContainText("Revoked");
        const denied = await provider.request.get("/api/provider-access", { headers: { "X-HealthBridge-Access-Code": code } });
        expect(denied.status()).toBe(403);
    } finally { await context.close(); }
});
