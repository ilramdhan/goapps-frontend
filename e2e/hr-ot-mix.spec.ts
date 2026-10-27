import { test, expect, type Page } from "@playwright/test"

// H036 — verifikasi browser kartu "Komposisi Tipe OT (%)" di dashboard HR_OT_TREND (stacked 100%, pergeseran pp).
// Data dev: tiap bulan berjumlah 100% (cek SQL dari HR_OT_HOURS). Login admin dev.
const SHOTS = process.env.H036_SHOTS ?? "/tmp/h036"
const USER = process.env.E2E_USER ?? "admin"
const PASS = process.env.E2E_PASS ?? "admin123"

async function login(page: Page) {
  await page.goto("/login")
  await page.getByLabel(/email|username/i).waitFor({ timeout: 60_000 })
  await page.waitForTimeout(3000) // tunggu hydration form
  await page.getByLabel(/email|username/i).fill(USER)
  await page.getByLabel(/password/i).fill(PASS)
  await page.getByRole("button", { name: /^(sign in|login)$/i }).click()
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 90_000 })
}

test.setTimeout(240_000)

test("H036 komposisi tipe OT", async ({ page }) => {
  await login(page)
  await page.goto("/finance/bi/HR_OT_TREND")
  const title = page.getByText("Komposisi Tipe OT (%)").first()
  await expect(title).toBeVisible({ timeout: 120_000 })
  await expect(page.getByText(/Pergeseran porsi/).first()).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/hr-ot-mix.png`, fullPage: true })
  const card = title.locator("xpath=ancestor::*[contains(@class,'rounded')][1]")
  console.log("MIX-CARD:", (await card.innerText()).replace(/\s+/g, " "))
})

// H037 — kartu konsentrasi lembur (Pareto top 10%) di HR_OT_TREND. Data dev: 202607–202610 = 27,3 / 21,4 / 24,6 / 25,8 %.
test("H037 konsentrasi lembur Pareto", async ({ page }) => {
  await login(page)
  await page.goto("/finance/bi/HR_OT_TREND")
  const title = page.getByText(/Konsentrasi Lembur: % Jam OT/).first()
  await expect(title).toBeVisible({ timeout: 120_000 })
  await expect(page.getByText(/pp vs bulan lalu/).first()).toBeVisible({ timeout: 30_000 })
  await page.screenshot({ path: `${SHOTS}/hr-ot-pareto.png`, fullPage: true })
  const card = title.locator("xpath=ancestor::*[contains(@class,'rounded')][1]")
  console.log("PARETO-CARD:", (await card.innerText()).replace(/\s+/g, " "))
})
