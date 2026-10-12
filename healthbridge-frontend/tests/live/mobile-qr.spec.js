import { test, expect } from "@playwright/test";
import { PNG } from "pngjs";
import jsQR from "jsqr";

test("real HTTPS QR access, consultation persistence, timeline, and revocation", async ({ page, browser }) => {
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
    await page.getByLabel("Health ID", { exact: true }).fill(`HB-SYNTHETIC-${Date.now()}`);
    await page.getByRole("button", { name: "Create Health Profile", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Digital Health Profile", exact: true })).toBeVisible();

    // Create records through the existing authenticated worker API; all calls below use the real backend.
    const auth = await page.evaluate(() => ({ token: localStorage.getItem("healthbridge_token"), user: JSON.parse(localStorage.getItem("healthbridge_user")) }));
    const headers = { Authorization: `Bearer ${auth.token}` };
    const profileResponse = await page.request.get(`/api/health-profile/user/${auth.user.id}`, { headers });
    expect(profileResponse.ok()).toBe(true);
    const profile = await profileResponse.json();
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
