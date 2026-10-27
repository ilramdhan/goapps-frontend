import { test, expect } from "@playwright/test"

// H030 — verifikasi browser banner job WORKFORCE (H014). Login superadmin (punya finance.bi.job.view).
// Prasyarat: ada job ETL_HR_* di dev; untuk butir badge sukses, sisipkan log SUCCESS (triggered_by 'H030').
const USER = process.env.E2E_USER ?? "admin"
const PASS = process.env.E2E_PASS ?? "admin123"
const SHOTS = process.env.H030_SHOTS ?? "/tmp/h030"
const DASH = process.env.H030_DASH ?? "HR_OT_DEPT"

test.setTimeout(240_000)

test("H030 banner job Workforce", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel(/email|username/i).waitFor({ timeout: 60_000 })
  await page.waitForTimeout(3000)
  await page.getByLabel(/email|username/i).fill(USER)
  await page.getByLabel(/password/i).fill(PASS)
  await page.getByRole("button", { name: /^(sign in|login)$/i }).click()
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 90_000 })

  await page.goto(`/finance/bi/${DASH}`)
  await expect(page.getByText(/Data per |Belum ada run sukses/).first()).toBeVisible({ timeout: 120_000 })
  console.log("BADGE:", await page.getByText(/Data per |Belum ada run sukses/).first().innerText())
  const alert = page.getByText("Run data terakhir gagal")
  console.log("ALERT-COUNT:", await alert.count())
  if (await alert.count()) console.log("ALERT:", await page.getByRole("alert").first().innerText())
  await page.screenshot({ path: `${SHOTS}/banner.png` })
})
