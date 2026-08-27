
import { test, expect } from "@playwright/test"
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000"

test("sticky deep probe", async ({ page }) => {
  test.setTimeout(180000)
  await page.setViewportSize({ width: 1280, height: 500 }) // short viewport => forces real scrolling
  await page.goto("/login")
  await page.getByLabel(/email|username/i).first().fill("admin")
  await page.getByLabel(/password/i).first().fill("admin123")
  await page.getByRole("button", { name: /^(sign in|login|masuk)$/i }).first().click()
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 })

  const resp = await page.request.get(`${BASE}/api/v1/finance/cost-product-masters?pageSize=5`)
  const sysId = (await resp.json())?.data?.[0]?.productSysId
  await page.goto(`/finance/product-master/${sysId}`)
  await page.waitForLoadState("domcontentloaded")
  const hdr = page.getByTestId("product-master-sticky-header")
  await expect(hdr).toBeVisible({ timeout: 20000 })

  // open the Routing tab which tends to be long, then wait for content
  await page.getByRole("tab", { name: /routing/i }).click().catch(()=>{})
  await page.waitForTimeout(4000)

  const probe = async () => await hdr.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const de = document.documentElement
    return { y: Math.round(r.y), maxScroll: de.scrollHeight - de.clientHeight,
             scrollY: Math.round(window.scrollY), z: getComputedStyle(el).zIndex,
             pos: getComputedStyle(el).position }
  })
  console.log("INIT=", JSON.stringify(await probe()))

  for (const px of [100, 200, 400]) {
    await page.evaluate((p)=>window.scrollTo(0,p), px)
    await page.waitForTimeout(350)
    console.log(`AT_${px}=`, JSON.stringify(await probe()))
  }
  await page.screenshot({ path: "/tmp/deep-after.png" })

  // Is our header hidden behind the app shell header?
  const overlap = await page.evaluate(() => {
    const ours = document.querySelector('[data-testid="product-master-sticky-header"]') as HTMLElement
    const shell = document.querySelector('header.sticky') as HTMLElement
    if (!ours || !shell) return null
    const o = ours.getBoundingClientRect(), s = shell.getBoundingClientRect()
    // which element is painted at the point just inside our header's top edge?
    const mid = document.elementFromPoint(o.x + o.width/2, o.y + 4)
    return { ourTop: Math.round(o.y), shellBottom: Math.round(s.bottom),
             overlapping: o.y < s.bottom,
             topmostAtOurTop: mid ? (mid.tagName + "." + (mid.className||"").toString().slice(0,50)) : null,
             ourZ: getComputedStyle(ours).zIndex, shellZ: getComputedStyle(shell).zIndex }
  })
  console.log("OVERLAP=", JSON.stringify(overlap))
})
