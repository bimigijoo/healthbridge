import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./tests",
    testIgnore: "**/live/**",
    fullyParallel: false,
    workers: 1,
    reporter: "list",
    use: {
        baseURL: "http://127.0.0.1:5174",
        headless: true,
        channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
        screenshot: "only-on-failure",
    },
    projects: [
        { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
        { name: "tablet", use: { viewport: { width: 768, height: 1024 } } },
        { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
    ],
    webServer: {
        command: "npm run dev -- --host 127.0.0.1 --port 5174 --strictPort",
        url: "http://127.0.0.1:5174",
        reuseExistingServer: !process.env.CI,
    },
});
