import { spawn } from "node:child_process";
import { build, preview } from "vite";
import { assertPortsFree, backendCommand, backendEnvironment, backendRoot, frontendConfig, publicOrigin } from "./classroom-demo-config.js";

try {
    const mode = process.argv[2];
    if (mode === "preflight") {
        await assertPortsFree([19080, 19443]);
        console.log("Dedicated loopback ports 19080 and 19443 are free. No application, database, or tunnel started.");
        if (process.env.CLASSROOM_PUBLIC_URL) publicOrigin(process.env.CLASSROOM_PUBLIC_URL);
        else console.log("CLASSROOM_PUBLIC_URL must be set after tunnel approval; neither launcher accepts an unset origin.");
    } else if (mode === "backend") {
        const env = backendEnvironment(process.env.CLASSROOM_PUBLIC_URL);
        await assertPortsFree([19080]);
        console.log("Starting separate synthetic H2 demo on 127.0.0.1:19080. Port 8080 and PostgreSQL are not used.");
        // Only this fixed repository command enters cmd.exe; URLs and secrets travel via environment, not shell text.
        const child = process.platform === "win32"
            ? spawn("cmd.exe", ["/d", "/s", "/c", '"' + backendCommand + '"'], {
                cwd: backendRoot, env, stdio: "inherit", windowsVerbatimArguments: true,
            })
            : spawn("./mvnw", ["-Dmaven.repo.local=target/.m2/repository", "-Dhealthbridge.build.directory=target/classroom-demo-build",
                "-Pclassroom-demo", "spring-boot:test-run", "-Dspring-boot.run.profiles=classroom-demo", "-B", "-ntp"], { cwd: backendRoot, env, stdio: "inherit" });
        child.on("error", () => { console.error("Classroom backend launcher failed. No existing application was stopped."); process.exitCode = 1; });
        child.on("exit", code => { process.exitCode = code ?? 1; });
    } else if (mode === "frontend") {
        if (process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS) throw new Error("Unset __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS for the restricted classroom host allowlist.");
        const config = frontendConfig(process.env.CLASSROOM_PUBLIC_URL);
        await assertPortsFree([19443]);
        await build(config);
        const server = await preview(config);
        console.log("Classroom preview on http://127.0.0.1:19443; /api proxies only to 127.0.0.1:19080. No tunnel started.");
        for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.httpServer.close(() => process.exit(0)));
    } else throw new Error("Use preflight, backend, or frontend. This launcher never starts a public tunnel.");
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
