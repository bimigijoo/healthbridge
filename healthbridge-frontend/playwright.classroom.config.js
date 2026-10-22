import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

// Simulated HTTPS edge origin, but real loopback preview/proxy and real Spring/H2 APIs. No public tunnel.
const env = { ...process.env, CLASSROOM_PUBLIC_URL: "https://synthetic.classroom.test" };
export default defineConfig({
    testDir: "./tests/classroom", outputDir: "test-results-classroom", workers: 1, timeout: 60000,
    use: { baseURL: "http://127.0.0.1:19443", channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
        viewport: { width: 390, height: 844 }, headless: true, screenshot: "off", trace: "off", video: "off" },
    webServer: [
        { command: "npm run demo:backend", cwd: fileURLToPath(new URL("./", import.meta.url)), env,
            url: "http://127.0.0.1:19080/api/auth/demo-ready", reuseExistingServer: false, timeout: 180000, stdout: "pipe" },
        { command: "npm run demo:frontend", cwd: fileURLToPath(new URL("./", import.meta.url)), env,
            url: "http://127.0.0.1:19443", reuseExistingServer: false, timeout: 120000, stdout: "pipe" },
    ],
});
