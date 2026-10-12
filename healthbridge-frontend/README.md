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
npm audit
```

Browser tests use synthetic intercepted API responses and Chrome by default. Set `PLAYWRIGHT_CHANNEL` to another installed Playwright-supported browser channel when needed. Screenshots and reports are ignored by Git.

`VITE_API_BASE_URL` optionally overrides the default `http://localhost:8080/api`. Do not place secrets in Vite environment variables; they are included in browser code.

See the [project README](../README.md) for backend setup and [demo guide](../DEMO.md) for the academic walkthrough.
