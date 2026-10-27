import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright config for the frontend e2e suite (cost-calc + BI Executive Dashboard).
 *
 * Specs log in per-test via e2e/helpers/login.ts (loginAs(page, "superadmin")), so no
 * global-setup/storageState is used.
 *
 * Prerequisites (full stack must be running):
 *   - finance gRPC :50051 + IAM gRPC :50052 (migrations applied; BI needs finance 000300–000314
 *     + IAM 000044), Redis, frontend on E2E_BASE_URL (default http://localhost:3000).
 *   - seeded users (superadmin = admin@goapps.dev / admin123) per e2e/helpers/login.ts.
 *
 * First-time only: `npx playwright install chromium`.
 * Run: `npm run test:e2e`
 */
export default defineConfig({
  testDir: "./e2e",
  // HR specs depend on dev data (not hermetic): manual only, run with E2E_HR=1.
  testIgnore: process.env.E2E_HR ? undefined : /hr-.*\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
