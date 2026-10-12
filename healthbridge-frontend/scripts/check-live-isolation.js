import assert from "node:assert/strict";
import net from "node:net";
import config from "../playwright.live.config.js";

const [backend, frontend] = config.webServer;
const origin = "https://localhost:18443";
const expected = {
    SPRING_CONFIG_LOCATION: "classpath:/application-mobile-e2e.properties",
    SPRING_CONFIG_ADDITIONAL_LOCATION: "", SPRING_CONFIG_IMPORT: "", SPRING_APPLICATION_JSON: "{}",
    SPRING_DATASOURCE_URL: "jdbc:h2:mem:healthbridge_mobile_e2e;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    SPRING_DATASOURCE_DRIVER_CLASS_NAME: "org.h2.Driver",
    SPRING_DATASOURCE_USERNAME: "sa", SPRING_DATASOURCE_PASSWORD: "", DB_PASSWORD: "",
    SPRING_JPA_HIBERNATE_DDL_AUTO: "create-drop", SERVER_ADDRESS: "127.0.0.1", SERVER_PORT: "18080",
    HEALTHBRIDGE_PUBLIC_FRONTEND_BASE_URL: origin, HEALTHBRIDGE_CORS_ALLOWED_ORIGINS: origin,
    JAVA_TOOL_OPTIONS: "", JDK_JAVA_OPTIONS: "", _JAVA_OPTIONS: "", MAVEN_OPTS: "", MAVEN_ARGS: "",
};
for (const [key, value] of Object.entries(expected)) {
    assert.ok(backend.env[key] === value, `Live test isolation refused: unexpected ${key}`);
}
assert.ok(backend.command.includes("-Pmobile-e2e") && backend.command.includes("-Dspring-boot.run.profiles=mobile-e2e"));
assert.ok(backend.command.includes("spring-boot:test-run"), "Live launcher must use the test runtime classpath");
assert.equal(backend.url, "http://127.0.0.1:18080/api/auth/e2e-ready");
assert.equal(frontend.url, origin);
assert.equal(config.use.baseURL, origin);
assert.equal(backend.reuseExistingServer, false);
assert.equal(frontend.reuseExistingServer, false);

// Only probe the dedicated test ports; never stop or reuse an existing listener.
for (const port of [18080, 18443]) {
    await new Promise((resolve, reject) => {
        const socket = net.connect({ host: "127.0.0.1", port });
        socket.setTimeout(2000);
        socket.once("connect", () => {
            socket.destroy();
            reject(new Error(`Dedicated test port ${port} is occupied; existing application left untouched.`));
        });
        socket.once("error", error => {
            if (error.code === "ECONNREFUSED") resolve();
            else reject(new Error(`Cannot safely verify dedicated test port ${port}.`));
        });
        socket.once("timeout", () => {
            socket.destroy();
            reject(new Error(`Cannot safely verify dedicated test port ${port}.`));
        });
    });
}
console.log("Configuration preflight passed: forced H2 in-memory + org.h2.Driver; test-only config; "
    + "backend 127.0.0.1:18080; HTTPS/CORS https://localhost:18443; dedicated ports free. No backend or database started.");
