import http from "node:http";
import path from "node:path";
import { readFile, realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { assertPortsFree, frontendRoot, publicOrigin } from "./classroom-demo-config.js";

export const outputDirectory = path.join(frontendRoot, "dist-review-postgres");
export const gatewayPort = 19444;
const maxBodyBytes = 16384;
const apiMethods = new Map([["/api/provider-access", "GET"], ["/api/provider-access/consultation", "POST"],
    ["/api/public/emergency-passport", "GET"]]);
const pages = new Set(["/provider-access", "/passport"]);
const types = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
    ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2" };
const uuid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const allowedHeaders = ["content-type", "x-healthbridge-access-code", "idempotency-key"];

export async function buildReviewFrontend() {
    await build({
        configFile: false, envDir: false, root: frontendRoot,
        define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify("/api") },
        build: { outDir: outputDirectory, sourcemap: false },
        plugins: [react(), {
            name: "healthbridge-review-public-entry",
            transformIndexHtml: { order: "pre", handler: html => {
                if (!html.includes('src="/src/main.jsx"')) throw new Error("Review public entry is missing; refusing the full application entry.");
                return html.replace('src="/src/main.jsx"', 'src="/@review-public-entry"');
            } },
            resolveId: id => id === "/@review-public-entry" ? "\0review-public-entry" : undefined,
            load: id => id !== "\0review-public-entry" ? undefined : [
                'import { createElement as h, StrictMode } from "react";',
                'import { createRoot } from "react-dom/client";',
                'import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";',
                'import { AuthContext } from "/src/context/AuthContextValue.js";',
                'import AppShell from "/src/components/AppShell.jsx";',
                'import ProviderAccessPage from "/src/pages/ProviderAccessPage.jsx";',
                'import PublicPassportPage from "/src/pages/PublicPassportPage.jsx";',
                'import "/src/index.css";',
                'const provider = h(AppShell, {publicAccess: true}, h(ProviderAccessPage));',
                'const passport = h(AppShell, {publicAccess: true, publicLabel: "Passport reference"}, h(PublicPassportPage));',
                'createRoot(document.getElementById("root")).render(h(StrictMode, null,',
                'h(AuthContext.Provider, {value: {user: null}}, h(BrowserRouter, null, h(Routes, null,',
                'h(Route, {path: "/provider-access", element: provider}),',
                'h(Route, {path: "/passport", element: passport}),',
                'h(Route, {path: "*", element: h(Navigate, {to: "/provider-access", replace: true})}))))));',
            ].join("\n"),
        }],
    });
}

function fail(response, status) {
    if (response.headersSent) response.destroy();
    else { response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" }); response.end("Request unavailable."); }
}

// Reject ambiguous paths before URL normalization; fragments belong only in the browser.
function canonicalPath(value) {
    return typeof value === "string" && value.startsWith("/") && !/[\\%?#;\s]/.test(value)
        && !value.includes("//") && !value.split("/").some(part => part === "." || part === "..");
}

export async function createReviewGateway({ publicBaseUrl, root = outputDirectory, upstreamPort = 8080 }) {
    const origin = publicOrigin(publicBaseUrl);
    const host = new URL(origin).host;
    if (!Number.isInteger(upstreamPort) || upstreamPort < 1 || upstreamPort > 65535) throw new Error("Invalid loopback upstream port.");
    const directory = await realpath(root);
    const server = http.createServer((request, response) => {
        void handle(request, response).catch(() => fail(response, 500));
    });
    server.headersTimeout = 10000;
    server.requestTimeout = 15000;
    server.maxHeadersCount = 40;
    server.on("clientError", (_error, socket) => {
        if (socket.writable) socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
    });
    for (const event of ["connect", "upgrade"]) server.on(event, (_request, socket) =>
        socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n"));

    async function handle(request, response) {
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("Referrer-Policy", "no-referrer");
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
        const localHost = "127.0.0.1:" + server.address().port;
        if (request.headers.host !== host && request.headers.host !== localHost) return fail(response, 403);
        if (!canonicalPath(request.url)) return fail(response, 404);
        const method = apiMethods.get(request.url);
        if (method) {
            const passport = request.url === "/api/public/emergency-passport";
            const credentialHeader = passport ? "x-healthbridge-passport-reference" : "x-healthbridge-access-code";
            const routeHeaders = passport ? [credentialHeader] : allowedHeaders;
            if (request.headers.origin && request.headers.origin !== origin) return fail(response, 403);
            if (request.method === "OPTIONS") {
                const requested = String(request.headers["access-control-request-headers"] || "")
                    .split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
                if (request.headers.origin !== origin || request.headers["access-control-request-method"] !== method
                        || requested.some(header => !routeHeaders.includes(header))) return fail(response, 403);
                response.writeHead(204, { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": method,
                    "Access-Control-Allow-Headers": routeHeaders.join(", "), Vary: "Origin" });
                response.end();
                return;
            }
            if (request.method !== method) return fail(response, 404);
            const code = request.headers[credentialHeader];
            const validCode = passport ? /^[A-Za-z0-9_-]{43}$/ : /^[\x21-\x7e]{1,128}$/;
            if (typeof code !== "string" || !validCode.test(code)) return fail(response, 403);
            let body;
            if (method === "POST") {
                if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers["content-type"] || "")
                        || request.headers["content-encoding"]) return fail(response, 415);
                if (!uuid.test(request.headers["idempotency-key"] || "")) return fail(response, 400);
                if (Number(request.headers["content-length"] || 0) > maxBodyBytes) { request.resume(); return fail(response, 413); }
                body = await new Promise((resolve, reject) => {
                    const chunks = [];
                    let bytes = 0;
                    request.on("data", chunk => {
                        bytes += chunk.length;
                        if (bytes > maxBodyBytes) {
                            if (chunks.length) chunks.length = 0;
                            if (!response.writableEnded) fail(response, 413);
                            resolve(null);
                        } else chunks.push(chunk);
                    });
                    request.on("end", () => resolve(Buffer.concat(chunks)));
                    request.on("error", reject);
                });
                if (body === null) return;
                try { JSON.parse(body.toString("utf8")); } catch { return fail(response, 400); }
            } else if (request.headers["transfer-encoding"] || Number(request.headers["content-length"] || 0) !== 0) return fail(response, 400);
            // Forward only consent credentials and JSON. Never forward JWTs, cookies, or client-controlled proxy headers.
            const headers = { Origin: origin, Accept: "application/json", [credentialHeader]: code };
            if (body) Object.assign(headers, { "Content-Type": "application/json", "Content-Length": body.length,
                "Idempotency-Key": request.headers["idempotency-key"] });
            const upstream = http.request({ hostname: "127.0.0.1", port: upstreamPort,
                path: request.url, method, headers, timeout: 10000 }, result => {
                if (result.statusCode >= 300 && result.statusCode < 400) { result.resume(); return fail(response, 502); }
                response.writeHead(result.statusCode, { "Content-Type": "application/json; charset=utf-8",
                    "Access-Control-Allow-Origin": origin, Vary: "Origin" });
                result.on("error", () => response.destroy());
                result.pipe(response);
            });
            upstream.on("timeout", () => { upstream.destroy(); fail(response, 504); });
            upstream.on("error", () => { if (!response.writableEnded) fail(response, 502); });
            response.on("close", () => { if (!response.writableFinished) upstream.destroy(); });
            upstream.end(body);
            return;
        }
        if (!["GET", "HEAD"].includes(request.method)) return fail(response, 404);
        if (request.url === "/") { response.writeHead(302, { Location: "/provider-access" }); response.end(); return; }
        const asset = /^\/assets\/[A-Za-z0-9_-]+\.(js|css|svg|png|jpg|webp|woff2)$/.test(request.url);
        if (!pages.has(request.url) && request.url !== "/favicon.svg" && !asset) return fail(response, 404);
        let filename;
        try {
            filename = await realpath(path.join(directory, pages.has(request.url) ? "index.html" : request.url.slice(1)));
        } catch { return fail(response, 404); }
        if (!filename.startsWith(directory + path.sep)) return fail(response, 404);
        const bytes = await readFile(filename);
        response.writeHead(200, { "Content-Type": pages.has(request.url) ? "text/html; charset=utf-8" : types[path.extname(filename)] });
        response.end(request.method === "HEAD" ? undefined : bytes);
    }
    return server;
}

async function main() {
    if (process.argv.length === 3 && process.argv[2] === "--build-only") { await buildReviewFrontend(); return; }
    if (process.argv.length !== 2) throw new Error("Use no arguments to start, or --build-only to build without starting services.");
    const origin = publicOrigin(process.env.PUBLIC_FRONTEND_BASE_URL);
    await assertPortsFree([gatewayPort]);
    await buildReviewFrontend();
    // The CLI always uses port 8080; the injectable factory port is only for loopback test fixtures.
    const server = await createReviewGateway({ publicBaseUrl: origin });
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(gatewayPort, "127.0.0.1", resolve);
    });
    console.log("Provider-only review gateway ready on 127.0.0.1:19444; approved API routes use 127.0.0.1:8080. No backend or tunnel was started.");
    for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch(() => {
        console.error("Review gateway refused startup. Check the public HTTPS origin, dedicated port, and frontend build. Existing services were left untouched.");
        process.exitCode = 1;
    });
}
