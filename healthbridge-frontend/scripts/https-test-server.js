import https from "node:https";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import selfsigned from "selfsigned";

const build = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], {
    shell: process.platform === "win32", stdio: "inherit",
    env: { ...process.env, VITE_API_BASE_URL: "/api" },
});
if (build.status !== 0) process.exit(build.status || 1);
const certificate = await selfsigned.generate([{ name: "commonName", value: "localhost" }], {
    days: 1, keySize: 2048,
    extensions: [{ name: "subjectAltName", altNames: [{ type: 2, value: "localhost" }, { type: 7, ip: "127.0.0.1" }] }],
});
const root = path.resolve("dist");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" };
const server = https.createServer({ key: certificate.private, cert: certificate.cert }, (request, response) => {
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Cache-Control", "no-store");
    if (request.url.startsWith("/api/")) {
        const upstream = http.request({ hostname: "127.0.0.1", port: 18080, path: request.url,
            method: request.method, headers: { ...request.headers, host: "127.0.0.1:18080" } }, result => {
            response.writeHead(result.statusCode, result.headers);
            result.pipe(response);
        });
        upstream.on("error", () => { response.writeHead(502); response.end(); });
        request.pipe(upstream);
        return;
    }
    let filename;
    try { filename = path.resolve(root, "." + decodeURIComponent(new URL(request.url, "https://localhost").pathname)); }
    catch { response.writeHead(400); response.end(); return; }
    if (filename !== root && !filename.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
    if (!fs.existsSync(filename) || !fs.statSync(filename).isFile()) filename = path.join(root, "index.html");
    response.setHeader("Content-Type", types[path.extname(filename)] || "application/octet-stream");
    fs.createReadStream(filename).pipe(response);
});
server.listen(18443, "127.0.0.1", () => console.log("Isolated HTTPS test frontend ready."));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
