# HealthBridge Frontend

The existing React/Vite frontend for HealthBridge's worker workspace, public provider access, and admin account management.

```powershell
npm ci
npm run dev -- --host 127.0.0.1 --port 5174
```

Verification:

```powershell
npm run lint
npm run build
npm run test:ui
npm run test:live
npm audit
```

`test:ui` browser tests use synthetic intercepted API responses and Chrome by default. Set `PLAYWRIGHT_CHANNEL` to another installed Playwright-supported browser channel when needed. Screenshots and reports are ignored by Git. The live suite disables screenshots, traces, and video to avoid capturing bearer credentials.

The default `/api` address is proxied to `http://localhost:8080` in development. `DEV_API_PROXY_TARGET` changes the development proxy target; `VITE_API_BASE_URL` sets an explicit public HTTPS API address at build time. Do not place secrets in Vite environment variables; they are included in browser code.

`test:live` uses an actual loopback HTTPS frontend/proxy and Spring Boot/H2 process, without mocked APIs. It does not deploy publicly or verify a physical phone camera. See [DEPLOYMENT.md](../DEPLOYMENT.md).

See the [project README](../README.md) for backend setup and [demo guide](../DEMO.md) for the academic walkthrough.
