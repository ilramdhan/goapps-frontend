import { test, expect, type Page } from "@playwright/test"

// H028 — verifikasi browser dashboard "Employee Overtime" (HD-18/HD-19, BI_HR_OT_EMPLOYEES).
// Prasyarat: finance 000556, IAM 000099, data OT HR di dev. Login admin dev (superadmin).
const SHOTS = process.env.H028_SHOTS ?? "/tmp/h028"
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

async function pickGroup(page: Page, label: RegExp) {
  await page.getByRole("combobox", { name: "Kelompokkan per" }).click()
  await page.getByRole("option", { name: label }).click()
}

test.describe.configure({ mode: "serial" })
test.setTimeout(240_000)

test("H028 Employee Overtime", async ({ page }) => {
  await login(page)

  // 1. menu + halaman
  await page.goto("/finance/bi")
  await expect(page.getByRole("heading", { name: "Executive Dashboard" })).toBeVisible({ timeout: 90_000 })
  await page.screenshot({ path: `${SHOTS}/1-landing.png`, fullPage: true })
  await page.goto("/finance/bi/HR_OT_EMPLOYEES")
  await expect(page.getByText("Total:").first()).toBeVisible({ timeout: 120_000 })
  await page.screenshot({ path: `${SHOTS}/1-page.png`, fullPage: true })
  console.log("MENU-LINK:", await page.getByRole("link", { name: "Employee Overtime" }).count())

  // 2. preset hanya periode
  const presetTrigger = page.getByRole("combobox").first()
  await presetTrigger.click()
  const presets = await page.getByRole("option").allInnerTexts()
  console.log("PRESETS:", JSON.stringify(presets))
  await page.screenshot({ path: `${SHOTS}/2-presets.png` })
  await page.keyboard.press("Escape")

  // 5. header kolom memuat rentang
  const headers = await page.locator("thead th").allInnerTexts()
  console.log("HEADERS:", JSON.stringify(headers))

  // 3. group by
  await page.getByRole("combobox", { name: "Kelompokkan per" }).click()
  console.log("GROUP-OPTIONS:", JSON.stringify(await page.getByRole("option").allInnerTexts()))
  await page.keyboard.press("Escape")
  await pickGroup(page, /Dept/i)
  await expect(page.locator("tr.bg-muted\\/60").first()).toBeVisible({ timeout: 90_000 })
  const subtotalsDept = await page.locator("tr.bg-muted\\/60").allInnerTexts()
  console.log("SUBTOTAL-DEPT:", subtotalsDept.length, JSON.stringify(subtotalsDept.slice(0, 3)))
  await page.screenshot({ path: `${SHOTS}/3-dept.png`, fullPage: true })
  await pickGroup(page, /Divisi/i)
  await page.waitForTimeout(1500)
  const subtotalsDiv = await page.locator("tr.bg-muted\\/60").allInnerTexts()
  console.log("SUBTOTAL-DIV:", subtotalsDiv.length, JSON.stringify(subtotalsDiv.slice(0, 3)))
  await page.screenshot({ path: `${SHOTS}/3-divisi.png`, fullPage: true })

  // 4. filter nilai grup
  await pickGroup(page, /Dept/i)
  await expect(page.locator("tr.bg-muted\\/60").first()).toBeVisible({ timeout: 90_000 })
  const before = (await page.getByText(/^Total: \d+ karyawan/).innerText())
  const gname = (subtotalsDept.find((t) => /^Dept: Finance\d/.test(t)) ?? subtotalsDept[0]).replace(/^Dept: /, "").replace(/\d+ karyawan[\s\S]*$/, "").trim()
  console.log("CHIP:", gname)
  const chip = page.locator(".cursor-pointer.select-none").filter({ hasText: new RegExp(`^${gname}$`) }).first()
  await chip.click()
  await page.waitForTimeout(2500)
  const after = (await page.getByText(/^Total: \d+ karyawan/).innerText())
  console.log("FILTER:", before, "->", after, "| subtotal rows:", await page.locator("tr.bg-muted\\/60").count())
  await page.screenshot({ path: `${SHOTS}/4-filter.png`, fullPage: true })

  // 6. hanya melebihi 14 jam (seluruh data, tanpa filter grup)
  await page.goto("/finance/bi/HR_OT_EMPLOYEES")
  await expect(page.getByText(/^Total: \d+ karyawan/)).toBeVisible({ timeout: 120_000 })
  const totalBefore = await page.getByText(/^Total: \d+ karyawan/).innerText()
  await page.getByRole("checkbox", { name: "Hanya melebihi 14 jam" }).click()
  const totalOver = await page.getByText(/^Total: \d+ karyawan/).innerText()
  const excess = await page.locator("tbody tr:not(.bg-muted\\/60)").evaluateAll((trs) =>
    trs.map((tr) => { const c = tr.querySelectorAll("td"); return [c[0]?.textContent, c[c.length - 2]?.textContent, c[c.length - 1]?.textContent] }))
  console.log("OVERONLY:", totalBefore, "->", totalOver, JSON.stringify(excess.slice(0, 5)))
  await page.screenshot({ path: `${SHOTS}/6-over.png`, fullPage: true })
  await page.getByRole("checkbox", { name: "Hanya melebihi 14 jam" }).click()

  // 7. drill NIK→hari
  const nik = (await page.locator("tbody tr.cursor-pointer td").first().innerText()).trim()
  console.log("DRILL-NIK:", nik)
  await page.locator("tbody tr.cursor-pointer").first().click()
  await page.waitForTimeout(10_000)
  await page.screenshot({ path: `${SHOTS}/7-drill.png`, fullPage: true })
  console.log("DRILL-URL:", page.url())
  console.log("DRILL-HEADERS:", JSON.stringify(await page.locator("thead th").allInnerTexts()))
  console.log("DRILL-ROWS:", JSON.stringify(await page.locator("tbody tr").evaluateAll((trs) => trs.slice(0, 5).map((t) => t.textContent))))

  // 8. COMPANY
  await page.goto("/finance/bi/HR_OT_EMPLOYEES")
  await expect(page.getByText("Total:").first()).toBeVisible({ timeout: 120_000 })
  await page.getByRole("combobox", { name: "Kelompokkan per" }).click()
  const opts = await page.getByRole("option").allInnerTexts()
  console.log("GROUP-OPTIONS-8:", JSON.stringify(opts))
  await page.getByRole("option", { name: /Company|Perusahaan/i }).click()
  await expect(page.locator("tr.bg-muted\\/60").first()).toBeVisible({ timeout: 90_000 })
  console.log("COMPANY-GROUPS:", JSON.stringify(await page.locator("tr.bg-muted\\/60").allInnerTexts()))
  await page.screenshot({ path: `${SHOTS}/8-company.png`, fullPage: true })
})

// H029 — sisi positif toggle "Hanya melebihi 14 jam". Butuh fixture `recon/h029_fixture.sql`
// (W43: TST-H029-00 over 3 jam kronis 3, TST-H029-01 over 0,5 kronis 1, TST-H029-02 di bawah batas).
test("H029 toggle melebihi 14 jam menyisakan over-limit + kronis", async ({ page }) => {
  test.skip(!process.env.H029_FIXTURE, "set H029_FIXTURE=1 setelah memuat recon/h029_fixture.sql")
  await login(page)
  await page.goto("/finance/bi/HR_OT_EMPLOYEES")
  const total = page.getByText(/^Total: \d+ karyawan/)
  await expect(total).toBeVisible({ timeout: 120_000 })
  const row = (nik: string) => page.locator("tbody tr", { hasText: nik })
  await expect(row("TST-H029-02")).toHaveCount(1)

  await page.getByRole("checkbox", { name: "Hanya melebihi 14 jam" }).click()
  await expect(total).toHaveText("Total: 2 karyawan")
  await expect(row("TST-H029-02")).toHaveCount(0)
  const cells = async (nik: string) => (await row(nik).locator("td").allInnerTexts()).slice(-4)
  const r0 = await cells("TST-H029-00")
  const r1 = await cells("TST-H029-01")
  console.log("OVER-ROWS:", JSON.stringify({ "TST-H029-00": r0, "TST-H029-01": r1 }))
  expect(r0.slice(1)).toEqual(["17.00", "3.00", "3"])
  expect(r1.slice(1)).toEqual(["14.50", "0.50", "1"])

  // drill NIK → hari: 2 hari, jam aktual + jam hitung batas
  await row("TST-H029-00").click()
  await expect(page.getByText("Jam OT aktual")).toBeVisible({ timeout: 60_000 })
  const days = await page.locator("tbody tr").evaluateAll((t) => t.map((r) => [...r.querySelectorAll("td")].map((c) => c.textContent)))
  console.log("OVER-DRILL:", JSON.stringify(days))
  expect(days).toEqual([["19 Okt 2026", "8.50", "8.50"], ["20 Okt 2026", "8.50", "8.50"]])
})
