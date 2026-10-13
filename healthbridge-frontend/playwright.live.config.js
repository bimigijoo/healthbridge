import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

export default defineConfig({
    testDir: "./tests/live", outputDir: "test-results-live", workers: 1, fullyParallel: false, timeout: 60000, reporter: "list",
    use: { baseURL: "https://localhost:18443", ignoreHTTPSErrors: true,
        channel: process.env.PLAYWRIGHT_CHANNEL || "chrome", headless: true,
        viewport: { width: 390, height: 844 }, screenshot: "off", trace: "off", video: "off" },
    webServer: [
        { command: '.\\mvnw.cmd "-Dmaven.repo.local=target/.m2/repository" "-Dhealthbridge.build.directory=target/live-e2e-build" -Pmobile-e2e spring-boot:test-run "-Dspring-boot.run.profiles=mobile-e2e" -B -ntp',
            cwd: fileURLToPath(new URL("../healthbridge-backend", import.meta.url)),
            env: { ...process.env, SPRING_CONFIG_LOCATION: "classpath:/application-mobile-e2e.properties",
                SPRING_CONFIG_ADDITIONAL_LOCATION: "", SPRING_CONFIG_IMPORT: "", SPRING_APPLICATION_JSON: "{}",
                JAVA_TOOL_OPTIONS: "", JDK_JAVA_OPTIONS: "", _JAVA_OPTIONS: "", MAVEN_OPTS: "", MAVEN_ARGS: "",
                SPRING_DATASOURCE_URL: "jdbc:h2:mem:healthbridge_mobile_e2e;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
                SPRING_DATASOURCE_DRIVER_CLASS_NAME: "org.h2.Driver",
                SPRING_DATASOURCE_USERNAME: "sa", SPRING_DATASOURCE_PASSWORD: "", DB_PASSWORD: "",
                SPRING_JPA_HIBERNATE_DDL_AUTO: "create-drop", SERVER_ADDRESS: "127.0.0.1", SERVER_PORT: "18080",
                JWT_SECRET: "synthetic-mobile-e2e-key-at-least-32-bytes",
                HEALTHBRIDGE_PUBLIC_FRONTEND_BASE_URL: "https://localhost:18443",
                HEALTHBRIDGE_CORS_ALLOWED_ORIGINS: "https://localhost:18443" },
            url: "http://127.0.0.1:18080/api/auth/e2e-ready", timeout: 180000, reuseExistingServer: false, stdout: "pipe" },
        { command: "node scripts/https-test-server.js", url: "https://localhost:18443", ignoreHTTPSErrors: true,
            timeout: 120000, reuseExistingServer: false, stdout: "pipe" },
    ],
});
