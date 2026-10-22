import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { PNG } from "pngjs";
import jsQR from "jsqr";

test("real classroom H2 proxy and anonymous QR consent workflow, simulated public origin", async ({ page, browser }) => {
    const ready = await page.request.get("/api/auth/demo-ready");
    const metadata = await ready.json();
    expect(metadata.database).toBe("H2");
    expect(metadata.jdbcUrl).toBe("jdbc:h2:mem:healthbridge_classroom_demo");
    const origin = "https://synthetic.classroom.test";
    expect((await page.request.get("/login", { headers: { Host: "synthetic.classroom.test" } })).status()).toBe(200);
    expect((await page.request.get("/login", { headers: { Host: "unapproved.example.test" } })).status()).toBe(403);
    const cors = await page.request.fetch("/api/provider-access/consultation", { method: "OPTIONS", headers: {
        Origin: origin, "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "x-healthbridge-access-code,idempotency-key,content-type",
    } });
    expect(cors.headers()["access-control-allow-origin"]).toBe(origin);
    const rejectedCors = await page.request.fetch("/api/provider-access", { method: "OPTIONS", headers: {
        Origin: "https://unapproved.example.test", "Access-Control-Request-Method": "GET",
    } });
    expect(rejectedCors.status()).toBe(403);
    const credentials = { email: "classroom-" + randomUUID() + "@example.test", password: randomUUID() };
    expect((await page.request.post("/api/auth/register", { data: { name: "Synthetic Classroom Worker", ...credentials } })).status()).toBe(201);
    const login = await page.request.post("/api/auth/login", { data: credentials });
    expect(login.status()).toBe(200);
    const auth = await login.json();
    const headers = { Authorization: "Bearer " + auth.token };
    const profileResponse = await page.request.post("/api/health-profile", { headers, data: { userId: auth.userId } });
    expect(profileResponse.status()).toBe(201);
    const profile = await profileResponse.json();
    const ids = [];
    for (const reason of ["Authorized synthetic classroom record", "Unshared synthetic classroom record"]) {
        const response = await page.request.post("/api/medical-records", { headers, data: {
            healthProfileId: profile.id, recordType: "LAB_REPORT", recordDate: "2026-01-15", reason,
        } });
        expect(response.status()).toBe(201);
        ids.push((await response.json()).id);
    }
    const passport = await page.request.get("/api/health-profile/" + profile.id + "/qr", { headers });
    expect(passport.status()).toBe(200);
    const passportPng = PNG.sync.read(await passport.body());
    const passportLink = jsQR(new Uint8ClampedArray(passportPng.data), passportPng.width, passportPng.height);
    expect(passportLink?.data === origin + "/passport").toBe(true);
    const sharing = await page.request.post("/api/sharing-sessions", { headers, data: {
        healthProfileId: profile.id, medicalRecordIds: [ids[0]], authorizeConsultation: true, durationHours: 1,
        providerName: "Synthetic Classroom Provider",
    } });
    expect(sharing.status()).toBe(201);
    const session = await sharing.json();
    const qr = await page.request.get("/api/sharing-sessions/" + session.id + "/qr", { headers });
    const png = PNG.sync.read(await qr.body());
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    const link = new URL(decoded.data);
    expect(link.origin === origin && link.pathname === "/provider-access" && !link.search).toBe(true);
    expect(new URLSearchParams(link.hash.slice(1)).get("access") === session.accessToken).toBe(true);

    const anonymous = await browser.newContext({ viewport: { width: 390, height: 844 } });
    try {
        const provider = await anonymous.newPage();
        // Substitute only the transport origin: there is no DNS/tunnel/TLS edge in this local smoke test.
        await provider.goto("http://127.0.0.1:19443/passport");
        await expect(provider.getByRole("heading", { name: "HealthBridge Passport Reference" })).toBeVisible();
        expect((await provider.request.get("http://127.0.0.1:19443/api/medical-records/profile/" + profile.id)).status()).toBe(401);
        await provider.goto("http://127.0.0.1:19443" + link.pathname + link.hash);
        await expect(provider.getByRole("heading", { name: "Shared Medical Records", exact: true })).toBeVisible();
        expect(new URL(provider.url()).hash).toBe("");
        await expect(provider.getByText("Authorized synthetic classroom record", { exact: false })).toBeVisible();
        await expect(provider.getByText("Unshared synthetic classroom record", { exact: false })).toHaveCount(0);
        await provider.getByLabel("Reason for Consultation").fill("Synthetic classroom consultation");
        await provider.getByRole("button", { name: "Add Consultation", exact: true }).click();
        await expect(provider.getByRole("status")).toContainText("Consultation added successfully");
        const timeline = await page.request.get("/api/health-timeline/profile/" + profile.id, { headers });
        expect(JSON.stringify(await timeline.json()).includes("Synthetic classroom consultation")).toBe(true);
        expect((await page.request.delete("/api/sharing-sessions/" + session.id, { headers })).status()).toBe(204);
        await provider.getByRole("button", { name: "Recheck access" }).click();
        await expect(provider.getByRole("alert")).toContainText("revoked");
        await expect(provider.locator(".ui-recordList")).toHaveCount(0);
        const blockedConsultation = await provider.request.post("http://127.0.0.1:19443/api/provider-access/consultation", {
            headers: { "X-HealthBridge-Access-Code": session.accessToken, "Idempotency-Key": randomUUID() },
            data: { recordDate: "2026-01-15", providerName: "Synthetic Classroom Provider", reason: "Synthetic revoked attempt" },
        });
        expect(blockedConsultation.status()).toBe(403);
        await provider.reload();
        await expect(provider.getByRole("heading", { name: "Worker Authorization" })).toBeVisible();
        await provider.goto("http://127.0.0.1:19443" + link.pathname + link.hash);
        await expect(provider.getByRole("alert")).toContainText("revoked");
    } finally { await anonymous.close(); }
});
