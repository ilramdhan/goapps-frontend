import { test, expect } from "@playwright/test"

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000"

test("sticky product master detail header", async ({ page }) => {
  test.setTimeout(120000)
  // ---- login ----
  await page.goto("/login")
  const email = page.getByLabel(/email|username/i).first()
  await email.fill("admin")
  await page.getByLabel(/password/i).first().fill("admin123")
  await page.getByRole("button", { name: /^(sign in|login|masuk)$/i }).first().click()
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 })
  console.log("LOGIN_OK url=", page.url())

  // ---- is there any product at all? ----
  const resp = await page.request.get(`${BASE}/api/v1/finance/cost-product-masters?pageSize=5`)
  console.log("API_STATUS=", resp.status())
  const body = await resp.json().catch(() => null)
  const rows = body?.data ?? []
  console.log("PRODUCT_COUNT=", Array.isArray(rows) ? rows.length : "n/a")
  console.log("TOTAL_ITEMS=", body?.pagination?.totalItems)
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log("NO_DATA: cannot open a detail page")
    return
  }
  const sysId = rows[0].productSysId ?? rows[0].product_sys_id
  console.log("USING_SYSID=", sysId)

  await page.goto(`/finance/product-master/${sysId}`)
  await page.waitForLoadState("domcontentloaded")

  const hdr = page.getByTestId("product-master-sticky-header")
  await expect(hdr).toBeVisible({ timeout: 15000 })

  // ---- which ancestor actually scrolls? ----
  // let async tabs/cards finish so the page is genuinely tall
  await page.waitForTimeout(3500)

  const probe = async () => await hdr.evaluate((el) => {
    const r = el.getBoundingClientRect()
    let n: any = el.parentElement, sc: any = null
    while (n && n !== document.documentElement) {
      if (n.scrollHeight > n.clientHeight + 2) { sc = n; break }
      n = n.parentElement
    }
    const de = document.documentElement
    const winScrollable = de.scrollHeight > de.clientHeight + 2
    return {
      y: Math.round(r.y), h: Math.round(r.height),
      scroller: sc ? (sc.tagName + "." + (sc.className||"").toString().slice(0,60)) : (winScrollable ? "WINDOW" : "NONE"),
      scrollTop: sc ? sc.scrollTop : window.scrollY,
      sh: sc ? sc.scrollHeight : de.scrollHeight,
      ch: sc ? sc.clientHeight : de.clientHeight,
    }
  })

  const doScroll = async (px: number) => await page.evaluate((px) => {
    const el = document.querySelector('[data-testid="product-master-sticky-header"]')!
    let n: any = el.parentElement
    while (n && n !== document.documentElement) {
      if (n.scrollHeight > n.clientHeight + 2) { n.scrollTop = px; return }
      n = n.parentElement
    }
    window.scrollTo(0, px)
  }, px)

  console.log("P0=", JSON.stringify(await probe()))
  await page.screenshot({ path: "/tmp/shot-before.png" })

  await doScroll(300); await page.waitForTimeout(400)
  const p1 = await probe(); console.log("P300=", JSON.stringify(p1))

  await doScroll(900); await page.waitForTimeout(400)
  const p2 = await probe(); console.log("P900=", JSON.stringify(p2))
  await page.screenshot({ path: "/tmp/shot-after.png" })

  // Sticky is proven if the header stays at the SAME pinned y across two
  // different scroll offsets, and remains on-screen.
  const pinned = Math.abs(p1.y - p2.y) < 3 && p2.y >= 0
  console.log("PINNED_STABLE=", pinned, "at y=", p1.y, "->", p2.y)

  const bg = await hdr.evaluate((e) => getComputedStyle(e).backgroundColor)
  console.log("HDR_BG=", bg)

  // does the app shell header overlap ours?
  const appHdr = await page.evaluate(() => {
    const h = document.querySelector('header.sticky') as HTMLElement | null
    if (!h) return null
    const r = h.getBoundingClientRect()
    return { y: Math.round(r.y), bottom: Math.round(r.bottom), z: getComputedStyle(h).zIndex }
  })
  console.log("APP_HEADER=", JSON.stringify(appHdr))

  // narrow viewport: buttons must not eat the screen
  await page.setViewportSize({ width: 390, height: 780 })
  await page.waitForTimeout(800)
  const nb = await probe()
  console.log("NARROW=", JSON.stringify(nb), "heightPctOfViewport=", Math.round((nb.h/780)*100))
  await page.screenshot({ path: "/tmp/shot-narrow.png" })

  // dark mode
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ colorScheme: "dark" })
  await page.waitForTimeout(600)
  const darkBg = await hdr.evaluate((e) => getComputedStyle(e).backgroundColor)
  console.log("DARK_BG=", darkBg)
  await doScroll(900); await page.waitForTimeout(400)
  console.log("DARK_PINNED=", JSON.stringify(await probe()))
  await page.screenshot({ path: "/tmp/shot-dark-after.png" })
})
