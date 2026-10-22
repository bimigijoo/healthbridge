import { test } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { assertPortsFree, backendCommand, backendEnvironment, frontendConfig, publicOrigin } from "./classroom-demo-config.js";
const origin = "https://synthetic.classroom.test";

test("demo origin must be public HTTPS with no credential or path", () => {
    assert.equal(publicOrigin(origin + "/"), origin);
    for (const value of [undefined, "", "http://synthetic.classroom.test", "https://localhost", "https://127.0.0.1", "https://192.168.1.2",
        "https://worker.local", "https://user:synthetic@synthetic.classroom.test", origin + "/path", origin + "/?access=synthetic", origin + "/#access=synthetic"]) {
        assert.throws(() => publicOrigin(value));
    }
});
test("inherited database, Spring, JVM, and Maven overrides cannot escape H2", () => {
    const env = backendEnvironment(origin, { PATH: "synthetic-path", SPRING_DATASOURCE_URL: "jdbc:postgresql://localhost/synthetic",
        SPRING_DATASOURCE_HIKARI_JDBC_URL: "jdbc:postgresql://localhost/synthetic", SPRING_PROFILES_ACTIVE: "normal",
        SPRING_APPLICATION_JSON: "unsafe", LOGGING_LEVEL_ORG_SPRINGFRAMEWORK_WEB: "TRACE",
        JAVA_TOOL_OPTIONS: "unsafe", MAVEN_ARGS: "unsafe", MVNW_REPOURL: "unsafe" });
    assert.equal(env.SPRING_DATASOURCE_URL, "jdbc:h2:mem:healthbridge_classroom_demo;MODE=PostgreSQL;DB_CLOSE_DELAY=-1");
    assert.equal(env.SPRING_DATASOURCE_DRIVER_CLASS_NAME, "org.h2.Driver");
    assert.equal(env.SERVER_ADDRESS, "127.0.0.1");
    assert.equal(env.SERVER_PORT, "19080");
    assert.equal(env.SPRING_CONFIG_LOCATION, "classpath:/application-classroom-demo.properties");
    assert.equal(env.SPRING_APPLICATION_JSON, "{}");
    assert.equal(env.SPRING_DATASOURCE_HIKARI_JDBC_URL, undefined);
    assert.equal(env.SPRING_PROFILES_ACTIVE, undefined);
    assert.equal(env.MVNW_REPOURL, undefined);
    assert.equal(env.LOGGING_LEVEL_ORG_SPRINGFRAMEWORK_WEB, undefined);
    assert.equal(env.JAVA_TOOL_OPTIONS, "");
    assert.equal(env.MAVEN_ARGS, "");
    assert.ok(env.JWT_SECRET.length >= 32);
    assert.notEqual(env.JWT_SECRET, backendEnvironment(origin).JWT_SECRET);
    assert.ok(backendCommand.includes("spring-boot:test-run") && backendCommand.includes("target/classroom-demo-build"));
});
test("frontend serves only compiled assets and uses the dedicated same-origin API", () => {
    const config = frontendConfig(origin);
    assert.equal(config.configFile, false);
    assert.equal(config.envDir, false);
    assert.equal(config.define["import.meta.env.VITE_API_BASE_URL"], '"/api"');
    assert.equal(config.preview.host, "127.0.0.1");
    assert.equal(config.preview.port, 19443);
    assert.equal(config.preview.strictPort, true);
    assert.deepEqual(config.preview.allowedHosts, ["synthetic.classroom.test"]);
    assert.equal(config.preview.proxy["^/api(?:/|$)"].target, "http://127.0.0.1:19080");
    assert.equal(config.preview.headers["Referrer-Policy"], "no-referrer");
});
test("occupied ports are refused without stopping the listener", async () => {
    const server = net.createServer(socket => socket.end());
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    try { await assert.rejects(assertPortsFree([server.address().port]), /occupied/); assert.ok(server.listening); }
    finally { await new Promise(resolve => server.close(resolve)); }
});
