import assert from "node:assert/strict";
import net from "node:net";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";

export const frontendRoot = fileURLToPath(new URL("../", import.meta.url));
export const backendRoot = fileURLToPath(new URL("../../healthbridge-backend", import.meta.url));
export const backendCommand = '.\\mvnw.cmd "-Dmaven.repo.local=target/.m2/repository" "-Dhealthbridge.build.directory=target/classroom-demo-build" -Pclassroom-demo spring-boot:test-run "-Dspring-boot.run.profiles=classroom-demo" -B -ntp';

export function publicOrigin(value) {
    let url;
    try { url = new URL(value); } catch { throw new Error("Set CLASSROOM_PUBLIC_URL to the approved public HTTPS origin."); }
    const host = url.hostname.toLowerCase();
    assert.ok(url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash && url.pathname === "/",
        "Classroom URL must be an HTTPS origin without credentials, path, query, or fragment.");
    assert.ok(!net.isIP(host) && !host.includes(":") && host.includes(".") &&
        !["localhost", "local", "internal", "lan"].some(suffix => host === suffix || host.endsWith("." + suffix)),
    "Use a public hostname, not localhost, a LAN hostname, or an IP address.");
    return url.origin;
}

export function backendEnvironment(origin, inherited = process.env) {
    const env = Object.fromEntries(Object.entries(inherited).filter(([key]) =>
        !/^(SPRING_|SERVER_|HEALTHBRIDGE_|DB_|JWT_|FILE_|LOGGING_|CLASSROOM_|JAVA_TOOL_OPTIONS$|JDK_JAVA_OPTIONS$|_JAVA_OPTIONS$|MAVEN_OPTS$|MAVEN_ARGS$|MVNW_)/i.test(key)));
    return { ...env, CLASSROOM_PUBLIC_URL: publicOrigin(origin), JWT_SECRET: randomBytes(48).toString("base64url"),
        SPRING_CONFIG_LOCATION: "classpath:/application-classroom-demo.properties",
        SPRING_CONFIG_ADDITIONAL_LOCATION: "", SPRING_CONFIG_IMPORT: "", SPRING_APPLICATION_JSON: "{}",
        SPRING_DATASOURCE_URL: "jdbc:h2:mem:healthbridge_classroom_demo;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        SPRING_DATASOURCE_DRIVER_CLASS_NAME: "org.h2.Driver", SPRING_DATASOURCE_USERNAME: "sa", SPRING_DATASOURCE_PASSWORD: "",
        SPRING_JPA_HIBERNATE_DDL_AUTO: "create-drop", SPRING_JPA_SHOW_SQL: "false",
        SERVER_ADDRESS: "127.0.0.1", SERVER_PORT: "19080",
        HEALTHBRIDGE_PUBLIC_FRONTEND_BASE_URL: publicOrigin(origin),
        HEALTHBRIDGE_CORS_ALLOWED_ORIGINS: publicOrigin(origin) + ",http://127.0.0.1:19443",
        JAVA_TOOL_OPTIONS: "", JDK_JAVA_OPTIONS: "", _JAVA_OPTIONS: "", MAVEN_OPTS: "", MAVEN_ARGS: "" };
}

export function frontendConfig(origin) {
    const url = new URL(publicOrigin(origin));
    return { configFile: false, envDir: false, root: frontendRoot, plugins: [react()],
        define: { "import.meta.env.VITE_API_BASE_URL": JSON.stringify("/api") },
        build: { outDir: "dist-classroom" },
        preview: { host: "127.0.0.1", port: 19443, strictPort: true, open: false,
            allowedHosts: [url.hostname], cors: false,
            headers: { "Referrer-Policy": "no-referrer", "Cache-Control": "no-store" },
            proxy: { "^/api(?:/|$)": { target: "http://127.0.0.1:19080", changeOrigin: true } } } };
}

export async function assertPortsFree(ports) {
    for (const port of ports) {
        await new Promise((resolve, reject) => {
            const socket = net.connect({ host: "127.0.0.1", port });
            socket.setTimeout(2000);
            socket.once("connect", () => { socket.destroy(); reject(new Error("Demo port " + port + " is occupied. Existing process left untouched.")); });
            socket.once("error", error => error.code === "ECONNREFUSED" ? resolve()
                : reject(new Error("Cannot safely verify demo port " + port + ".")));
            socket.once("timeout", () => { socket.destroy(); reject(new Error("Cannot safely verify demo port " + port + ".")); });
        });
    }
}
