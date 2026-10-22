import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import https from "node:https";
import { readFile, readdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import selfsigned from "selfsigned";
import { buildReviewFrontend, createReviewGateway, outputDirectory } from "./review-postgres-public.js";

let origin;
const code = "synthetic-review-consent";
const passportReference = "a".repeat(43);
const nonce = "12345678-1234-1234-1234-123456789abc";
let backend;
let gateway;
let port;
let calls = [];
let revoked = false;
let redirect = false;
let browser;
let edge;

async function listen(server) {
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    return server.address().port;
}
async function close(server) {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
}
function request(route, { method = "GET", headers = {}, body } = {}) {
    return new Promise((resolve, reject) => {
        const connection = http.request({ hostname: "127.0.0.1", port, path: route, method, headers }, response => {
            const chunks = [];
            response.on("data", chunk => chunks.push(chunk));
            response.on("end", () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString() }));
        });
        connection.on("error", reject);
        connection.end(body);
    });
}
const consentHeaders = { "X-HealthBridge-Access-Code": code };
const postHeaders = { ...consentHeaders, "Content-Type": "application/json", "Idempotency-Key": nonce };

before(async () => {
    await buildReviewFrontend();
    // Synthetic in-process HTTP fixture only: no Spring process, PostgreSQL, or real port 8080.
    backend = http.createServer((req, res) => {
        const chunks = [];
        req.on("data", chunk => chunks.push(chunk));
        req.on("end", () => {
            calls.push({ method: req.method, path: req.url, headers: req.headers, body: Buffer.concat(chunks).toString() });
            if (redirect) { res.writeHead(302, { Location: "/api/admin/users", "Set-Cookie": "synthetic=unused" }); res.end(); return; }
            res.setHeader("Content-Type", "application/json");
            if (req.url === "/api/public/emergency-passport") {
                if (revoked || req.headers["x-healthbridge-passport-reference"] !== passportReference) {
                    res.writeHead(404); res.end(); return;
                }
                res.end(JSON.stringify({ bloodGroup: "O+", allergies: [{ allergen: "Synthetic allergy", reaction: "Synthetic reaction" }] }));
                return;
            }
            if (revoked || req.headers["x-healthbridge-access-code"] !== code) {
                res.writeHead(403); res.end(JSON.stringify({ message: "Sharing access is invalid, expired, or revoked." })); return;
            }
            if (req.method === "POST") {
                res.writeHead(201); res.end(JSON.stringify({ id: 2, ...JSON.parse(Buffer.concat(chunks).toString()) })); return;
            }
            res.end(JSON.stringify({ providerName: "Synthetic Provider", providerFacility: "Synthetic Clinic",
                expiresAt: "2099-01-01T00:00:00Z", medicalRecords: [{
                    id: 1, recordType: "LAB_REPORT", recordDate: "2026-01-15", reason: "Selected synthetic record",
                }] }));
        });
    });
    const upstreamPort = await listen(backend);
    const certificate = await selfsigned.generate([{ name: "commonName", value: "synthetic.review.test" }], {
        days: 1, keySize: 2048,
        extensions: [{ name: "subjectAltName", altNames: [{ type: 2, value: "synthetic.review.test" }] }],
    });
    // Local TLS fixture simulates only the HTTPS edge, never a public tunnel or internet connection.
    edge = https.createServer({ key: certificate.private, cert: certificate.cert }, (req, res) => {
        const upstream = http.request({ hostname: "127.0.0.1", port, path: req.url, method: req.method, headers: req.headers }, result => {
            res.writeHead(result.statusCode, result.headers);
            result.pipe(res);
        });
        upstream.on("error", () => { res.writeHead(502); res.end(); });
        req.pipe(upstream);
    });
    origin = "https://synthetic.review.test:" + await listen(edge);
    gateway = await createReviewGateway({ publicBaseUrl: origin, upstreamPort });
    port = await listen(gateway);
});
beforeEach(() => { calls = []; revoked = false; redirect = false; });
after(async () => {
    if (browser) await browser.close();
    if (edge) await close(edge);
    if (gateway) await close(gateway);
    if (backend) await close(backend);
});

test("gateway configuration rejects missing/non-public origins and invalid loopback ports", async () => {
    for (const value of [undefined, "", "http://synthetic.review.test", "https://localhost", "https://127.0.0.1",
        "https://user:synthetic@synthetic.review.test", "https://synthetic.review.test/path",
        "https://synthetic.review.test/?access=synthetic", "https://synthetic.review.test/#access=synthetic"]) {
        await assert.rejects(createReviewGateway({ publicBaseUrl: value }));
    }
    for (const upstreamPort of [0, -1, 65536, "8080"]) {
        await assert.rejects(createReviewGateway({ publicBaseUrl: origin, upstreamPort }));
    }
    assert.equal(calls.length, 0);
});

test("only approved static pages/assets are served and forbidden routes never reach the backend", async () => {
    for (const route of ["/provider-access", "/passport", "/favicon.svg"]) assert.equal((await request(route)).status, 200);
    assert.equal((await request("/")).headers.location, "/provider-access");
    const asset = (await readdir(outputDirectory + "/assets")).find(name => name.endsWith(".js"));
    assert.equal((await request("/assets/" + asset)).status, 200);
    for (const route of ["/login", "/register", "/admin", "/dashboard", "/health-profile", "/health-passport", "/medical-records",
        "/health-timeline", "/share-records", "/index.html", "/src/main.jsx", "/.env", "/@vite/client", "/api", "/api/auth/login",
        "/api/auth/register", "/api/admin/users", "/api/admin/overview", "/api/health-profile/1/qr",
        "/api/health-profile/1/passport-link", "/api/medical-records/profile/1", "/api/medical-documents/1/download",
        "/api/sharing-sessions", "/api/access-logs/session/1", "/api/allergies/profile/1",
        "/api/existing-conditions/profile/1", "/api/current-medications/profile/1", "/api/follow-ups/profile/1",
        "/api/provider-access/" + code,
        "/api/provider-access/" + code + "/consultation", "/api/auth/demo-ready"]) {
        for (const method of ["GET", "POST", "OPTIONS"]) {
            assert.equal((await request(route, { method, headers: postHeaders })).status, 404, method + " " + route);
        }
    }
    assert.equal(calls.length, 0);
});

test("emergency passport forwards only its own credential and stays strictly read-only", async () => {
    const route = "/api/public/emergency-passport";
    const headers = { "X-HealthBridge-Passport-Reference": passportReference,
        ...consentHeaders, Authorization: "Bearer synthetic-not-forwarded", Cookie: "synthetic=not-forwarded" };
    const result = await request(route, { headers });
    assert.equal(result.status, 200);
    assert.deepEqual(Object.keys(JSON.parse(result.body)).sort(), ["allergies", "bloodGroup"]);
    assert.equal(result.headers["cache-control"], "no-store");
    assert.equal(calls[0].headers["x-healthbridge-passport-reference"], passportReference);
    for (const key of ["authorization", "cookie", "x-healthbridge-access-code"]) assert.equal(calls[0].headers[key], undefined);
    calls = [];
    for (const method of ["POST", "PUT", "PATCH", "DELETE", "HEAD"]) assert.equal((await request(route, { method, headers })).status, 404);
    for (const suffix of ["/1", "/regenerate", "?reference=" + passportReference, "/consultation"])
        assert.equal((await request(route + suffix, { headers })).status, 404);
    for (const path of ["/api/emergency-passport/profile/1", "/api/emergency-passport/profile/1/link",
        "/api/emergency-passport/profile/1/qr", "/api/emergency-passport/profile/1/regenerate"])
        assert.equal((await request(path, { method: "GET", headers })).status, 404);
    assert.equal((await request(route, { headers: consentHeaders })).status, 403);
    assert.equal((await request(route, { headers: { "X-HealthBridge-Passport-Reference": "invalid" } })).status, 403);
    assert.equal(calls.length, 0);
    const cors = { Origin: origin, "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "x-healthbridge-passport-reference" };
    assert.equal((await request(route, { method: "OPTIONS", headers: cors })).status, 204);
    assert.equal((await request(route, { method: "OPTIONS", headers: { ...cors,
        "Access-Control-Request-Headers": "x-healthbridge-access-code" } })).status, 403);
    revoked = true;
    assert.equal((await request(route, { headers })).status, 404);
});

test("ambiguous paths, queries, wrong methods, and hostile hosts/origins are denied before proxying", async () => {
    for (const route of ["/api/provider-access?access=synthetic", "/passport?healthId=synthetic", "/api/provider-access/",
        "/api//provider-access", "//api/provider-access", "/api/./provider-access", "/api/x/../provider-access",
        "/api/%70rovider-access", "/api/provider-access%2f..%2fauth/login", "/api/provider-access;ignored",
        "/api\\provider-access", "/API/provider-access", "/assets/../index.html", "/assets/%2e%2e/index.html",
        "/assets/index.js.map", "http://synthetic.review.test/api/provider-access"]) {
        assert.equal((await request(route, { headers: consentHeaders })).status, 404, route);
    }
    for (const method of ["PUT", "PATCH", "DELETE", "HEAD", "POST"]) {
        assert.equal((await request("/api/provider-access", { method, headers: postHeaders })).status, 404);
    }
    assert.equal((await request("/api/provider-access/consultation", { headers: consentHeaders })).status, 404);
    assert.equal((await request("/passport", { headers: { Host: "unapproved.example.test" } })).status, 403);
    assert.equal((await request("/api/provider-access", { headers: { ...consentHeaders, Origin: "https://unapproved.example.test" } })).status, 403);
    assert.equal(calls.length, 0);
});

test("allowed GET and POST forward only consent headers, preserve responses, and never redirect upstream", async () => {
    const result = await request("/api/provider-access", { headers: {
        ...consentHeaders, Host: new URL(origin).host, Authorization: "Bearer synthetic-must-not-forward",
        Cookie: "synthetic=must-not-forward", "X-Forwarded-Host": "unapproved.example.test",
        "X-HTTP-Method-Override": "DELETE",
    } });
    assert.equal(result.status, 200);
    assert.equal(JSON.parse(result.body).medicalRecords.length, 1);
    assert.equal(result.headers["cache-control"], "no-store");
    assert.equal(result.headers["referrer-policy"], "no-referrer");
    assert.ok(result.headers["content-security-policy"].includes("frame-ancestors 'none'"));
    assert.equal(calls[0].headers.authorization, undefined);
    assert.equal(calls[0].headers.cookie, undefined);
    assert.equal(calls[0].headers["x-forwarded-host"], undefined);
    assert.equal(calls[0].headers["x-http-method-override"], undefined);
    assert.equal(calls[0].headers.origin, origin);
    assert.equal(calls[0].headers["x-healthbridge-access-code"], code);
    const body = JSON.stringify({ providerName: "Synthetic Provider", recordDate: "2026-01-15", reason: "Synthetic consultation" });
    assert.equal((await request("/api/provider-access/consultation", { method: "POST", headers: postHeaders, body })).status, 201);
    assert.equal(calls[1].method, "POST");
    assert.equal(calls[1].headers["idempotency-key"], nonce);
    assert.equal(calls[1].body, body);
    redirect = true;
    const blocked = await request("/api/provider-access", { headers: consentHeaders });
    assert.equal(blocked.status, 502);
    assert.equal(blocked.headers.location, undefined);
    assert.equal(blocked.headers["set-cookie"], undefined);
});

test("preflight is limited to the approved origin, method, and headers", async () => {
    const headers = { Origin: origin, "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,x-healthbridge-access-code,idempotency-key" };
    const allowed = await request("/api/provider-access/consultation", { method: "OPTIONS", headers });
    assert.equal(allowed.status, 204);
    assert.equal(allowed.headers["access-control-allow-origin"], origin);
    for (const extra of [{ Origin: "https://unapproved.example.test" }, { "Access-Control-Request-Method": "DELETE" },
        { "Access-Control-Request-Headers": "authorization" }]) {
        assert.equal((await request("/api/provider-access/consultation", { method: "OPTIONS", headers: { ...headers, ...extra } })).status, 403);
    }
    assert.equal(calls.length, 0);
});

test("missing codes, malformed JSON, oversized/chunked bodies, and non-JSON writes do not reach the backend", async () => {
    assert.equal((await request("/api/provider-access")).status, 403);
    for (const [headers, body, expected] of [
        [postHeaders, "not-json", 400],
        [{ ...postHeaders, "Content-Type": "text/plain" }, "{}", 415],
        [{ ...postHeaders, "Content-Encoding": "gzip" }, "{}", 415],
        [{ ...postHeaders, "Idempotency-Key": "invalid" }, "{}", 400],
        [postHeaders, JSON.stringify({ reason: "x".repeat(17000) }), 413],
        [{ ...postHeaders, "Transfer-Encoding": "chunked" }, JSON.stringify({ reason: "x".repeat(17000) }), 413],
    ]) {
        assert.equal((await request("/api/provider-access/consultation", { method: "POST", headers, body })).status, expected);
    }
    assert.equal(calls.length, 0);
});

test("backend denial for invalid/expired/revoked consent is preserved for reads and writes", async () => {
    const invalid = await request("/api/provider-access", { headers: { "X-HealthBridge-Access-Code": "invalid-synthetic" } });
    assert.equal(invalid.status, 403);
    revoked = true;
    assert.equal((await request("/api/provider-access", { headers: consentHeaders })).status, 403);
    assert.equal((await request("/api/provider-access/consultation", { method: "POST", headers: postHeaders, body: "{}" })).status, 403);
});

test("public-only build excludes login/registration/private pages and keeps passport/provider usable on mobile and desktop", async () => {
    browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || "chrome", headless: true,
        args: ["--host-resolver-rules=MAP synthetic.review.test 127.0.0.1", "--no-proxy-server"] });
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
        const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
        try {
            const page = await context.newPage();
            const renderErrors = [];
            page.on("pageerror", error => renderErrors.push(error.message));
            page.on("console", message => { if (message.type() === "error") renderErrors.push(message.text()); });
            const base = origin;
            await page.goto(base + "/passport#healthId=HB-SYNTHETIC-REFERENCE");
            try { await page.getByRole("heading", { name: "HealthBridge Passport Reference" }).waitFor({ timeout: 5000 }); }
            catch { throw new Error("Public passport render failed: " + renderErrors.join("; ")); }
            await page.waitForFunction(() => location.hash === "");
            assert.equal(calls.length, 0);
            assert.equal(await page.getByText("Unverified Health ID reference:", { exact: false }).count(), 1);
            assert.equal(await page.getByRole("navigation", { name: "Main navigation" }).count(), 0);
            await page.goto(base + "/passport#reference=" + passportReference);
            await page.getByRole("heading", { name: "Emergency Health Passport", exact: true }).waitFor();
            await page.waitForFunction(() => location.hash === "");
            assert.equal(await page.getByText("Synthetic allergy: Synthetic reaction", { exact: true }).count(), 1);
            assert.equal(await page.getByRole("heading", { name: "Current Medications", exact: true }).count(), 0);
            assert.equal(await page.getByRole("button", { name: "Add Consultation", exact: true }).count(), 0);
            // The public shell brand link cannot render a login form via client-side routing.
            await page.getByRole("link", { name: "HealthBridge", exact: true }).click();
            await page.getByRole("heading", { name: "Worker Authorization" }).waitFor();
            assert.ok(page.url().endsWith("/provider-access"));
            assert.equal(await page.getByRole("button", { name: "Sign In", exact: true }).count(), 0);
            await page.goto(base + "/provider-access#access=" + code);
            await page.getByRole("heading", { name: "Shared Medical Records", exact: true }).waitFor();
            await page.waitForFunction(() => location.hash === "");
            assert.equal(await page.getByText("Selected synthetic record", { exact: false }).count(), 1);
            await page.getByLabel("Reason for Consultation").fill("Synthetic browser consultation");
            await page.getByRole("button", { name: "Add Consultation", exact: true }).click();
            await page.getByRole("status").filter({ hasText: "Consultation added successfully" }).waitFor();
            revoked = true;
            await page.getByRole("button", { name: "Recheck access" }).click();
            await page.getByRole("alert").filter({ hasText: "revoked" }).waitFor();
            assert.equal(await page.locator(".ui-recordList").count(), 0);
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
            assert.equal(await page.evaluate(() => Object.keys(localStorage).length + Object.keys(sessionStorage).length), 0);
        } finally { await context.close(); calls = []; revoked = false; }
    }
    const files = await readdir(outputDirectory + "/assets");
    const codeBundle = (await Promise.all(files.filter(name => name.endsWith(".js")).map(name => readFile(outputDirectory + "/assets/" + name, "utf8")))).join("");
    for (const privateText of ["Signing in...", "Create Temporary Access", "Digital Health Passport", "Create Account"]) {
        assert.equal(codeBundle.includes(privateText), false);
    }
});
