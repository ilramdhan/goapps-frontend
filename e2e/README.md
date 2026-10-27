# BI Executive Dashboard — Playwright E2E

End-to-end specs for the viewer (drill/compare) and the admin wizard (zero-JSON create flow).

## Prerequisites

These specs drive the **real, running stack** — they are NOT hermetic.

1. **Backend up with migrations applied:**
   - finance gRPC `:50051` (+ HTTP gateway `:8080`) with migrations `000300–000314` applied
     (provides `bi_*` tables, the 2 reference dashboards `EBITDA`/`NET_PROFIT`, and 288 demo
     fact rows).
   - IAM gRPC `:50052` with migration `000015` applied (BI permissions + menus + SUPER_ADMIN
     role grants).
   - Redis + (optionally) RabbitMQ from `docker compose up -d`.
2. **Frontend up** on `E2E_BASE_URL` (default `http://localhost:3000`): `npm run dev` or
   `npm run build && npm start`.
3. **Seeded users** matching `e2e/helpers/login.ts` (superadmin = `admin@goapps.dev` /
   `admin123`). Specs log in per-test via `loginAs(page, "superadmin")` in `beforeEach`.
4. **Browser binary (first run only):** `npx playwright install chromium`.

## Run

```bash
# from goapps-frontend/
npm run test:e2e
# interactive:
npm run test:e2e:ui
```

Login is per-test via `e2e/helpers/login.ts` (shared with the cost-calc specs) — no
global storage state.

## Specs

| File | Covers |
|---|---|
| `bi-viewer.spec.ts` | landing lists dashboards → navigate to EBITDA viewer → KPIs + chart render → compare=YoY reflected in URL → period preset via URL |
| `bi-admin-wizard.spec.ts` | admin tabs render → 7-step wizard creates a bar dashboard (zero-JSON: dropdowns only) → new code appears in the admin list |

## Notes

- Specs run serially (`workers: 1`) because the wizard test mutates shared dashboard state.
- The compare/drill assertions are best-effort on chart internals (ECharts renders to
  `<canvas>`); they assert the chart element + URL state rather than pixel content.
- CI integration is deferred: wire these into a workflow that boots the stack (compose +
  migrate + seed) before `npm run test:e2e`.

## HR / Workforce specs (`hr-*.spec.ts`) — manual

These depend on seeded dev data and are skipped by default (so `test:e2e` in CI ignores them).
Run explicitly: `E2E_HR=1 npx playwright test hr-`.
