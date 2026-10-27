import { test, expect, type Page } from "@playwright/test"

// H042 — verifikasi browser tren over-limit di tab Kepatuhan 14 Jam (HR_OT_OVERLIMIT). Login admin dev.
const SHOTS = process.env.H042_SHOTS ?? "/tmp/h042"
const USER = process.env.E2E_USER ?? "admin"
const PASS = process.env.E2E_PASS ?? "admin123"

async function login(page: Page) {
  await page.goto("/login")
  await page.getByLabel(/email|username/i).waitFor({ timeout: 60_000 })
  await page.waitForTimeout(3000)
  await page.getByLabel(/email|username/i).fill(USER)
  await page.getByLabel(/password/i).fill(PASS)
  await page.getByRole("button", { name: /^(sign in|login)$/i }).click()
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 90_000 })
}

test.setTimeout(240_000)

test("H042 tren over-limit di Kepatuhan 14 Jam + drill dept/orang", async ({ page }) => {
  await login(page)
  await page.goto("/finance/bi/HR_OT_OVERLIMIT")
  await expect(page.getByRole("link", { name: "Tren Over-limit" })).toHaveCount(0)
  await expect(page.getByText("Tren Over-limit per Bulan Payroll")).toBeVisible({ timeout: 120_000 })
  await page.locator(".recharts-bar-rectangle path").first().waitFor({ state: "visible", timeout: 60_000 })
  await page.screenshot({ path: `${SHOTS}/over-month-top.png`, fullPage: true })
  // klik bulan terakhir di grafik → tabel dept muncul → klik dept → tabel NIK
  const bars = page.locator(".recharts-bar-rectangle path").last()
  await bars.click({ force: true })
  await expect(page.getByText(/^Dept, bulan \d{6}/)).toBeVisible({ timeout: 60_000 })
  const deptCell = page.locator("table tbody tr td:first-child").first()
  await expect(deptCell).toBeVisible({ timeout: 60_000 })
  await deptCell.click()
  await expect(page.getByText(/^Karyawan di /)).toBeVisible({ timeout: 60_000 })
  await page.screenshot({ path: `${SHOTS}/over-month-drill.png`, fullPage: true })
})
