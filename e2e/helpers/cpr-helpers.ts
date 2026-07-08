import { type Page, expect } from "@playwright/test"

// ─── Auth ────────────────────────────────────────────────────────────────────

export const TEST_USERS = {
  marketing01:   { username: "marketing01",   password: "Mgt123456789" },
  marketingmgr:  { username: "marketingmgr",  password: "Mgt123456789" },
  finance01:     { username: "finance01",      password: "Mgt123456789" },
  financemgr:    { username: "financemgr",     password: "Mgt123456789" },
  production01:  { username: "production01",   password: "Mgt123456789" },
  production02:  { username: "production02",   password: "Mgt123456789" },
  production03:  { username: "production03",   password: "Mgt123456789" },
  productionmgr: { username: "productionmgr",  password: "Mgt123456789" },
}

export async function loginAs(page: Page, user: keyof typeof TEST_USERS) {
  const { username, password } = TEST_USERS[user]

  // Call the login API via page.request so Set-Cookie headers are applied to the browser
  // context, avoiding the login-page background image that intercepts button clicks.
  const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000"
  const resp = await page.request.post(`${baseUrl}/api/v1/iam/auth/login`, {
    data: { username, password },
  })
  if (!resp.ok()) {
    throw new Error(`Login API failed for ${username}: ${resp.status()}`)
  }
  const body = await resp.json()
  if (!body?.base?.isSuccess) {
    throw new Error(`Login rejected for ${username}: ${body?.base?.message}`)
  }

  // The BFF sets goapps_access_token + goapps_refresh_token as HttpOnly cookies.
  // page.request shares storage state with the browser context, so they are now set.
  // Navigate directly to the product-requests page (protected route).
  await page.goto("/finance/product-requests")
  await page.waitForLoadState("load")

  // If redirected to login the cookies weren't set — fail with a clear message
  if (page.url().includes("/login")) {
    throw new Error(`Login cookies not applied for ${username} — still on login page`)
  }
}

export async function logout(page: Page) {
  // Click user avatar/menu in nav
  await page.locator('[data-testid="nav-user-trigger"]').click()
  await page.getByRole("menuitem", { name: /log out|sign out/i }).click()
  await page.waitForURL("/login")
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export async function gotoProductRequests(page: Page) {
  await page.goto("/finance/product-requests")
  await page.waitForLoadState("load")
}

export async function gotoRequestDetail(page: Page, requestId: string | number) {
  if (!requestId) throw new Error(`gotoRequestDetail: requestId is empty — prior test may have failed to set it`)
  await page.goto(`/finance/product-requests/${requestId}`)
  await page.waitForLoadState("load")
  // Wait for the React app to hydrate and load auth/permissions — the status badge
  // is only rendered after the request data and user permissions are both resolved.
  await page.waitForSelector('[data-testid="request-status-badge"]', { timeout: 15000 })
}

// ─── CPR Create ───────────────────────────────────────────────────────────────

// urgency values as accepted by the form Select ("low"/"medium"/"high")
const URGENCY_MAP: Record<string, string> = {
  NORMAL: "medium",
  HIGH: "high",
  URGENT: "high",
  low: "low",
  medium: "medium",
  high: "high",
}

export interface CreateCprInput {
  title: string
  classification?: "existing" | "new"
  urgency?: "NORMAL" | "HIGH" | "URGENT" | "low" | "medium" | "high"
  customerName?: string
  description?: string
}

export async function createDraftRequest(
  page: Page,
  input: CreateCprInput,
): Promise<string> {
  await gotoProductRequests(page)

  // Click new request button
  await page.getByRole("button", { name: /new request/i }).click()
  await page.waitForSelector('[role="dialog"]', { state: "visible" })

  // Select request type (required) — trigger has role="combobox" but no accessible name;
  // filter by placeholder text. Pick QUOTE to avoid forced "new" classification + spec section.
  const typeCombobox = page.getByRole("combobox").filter({ hasText: /select request type/i })
  await typeCombobox.waitFor({ state: "visible", timeout: 5000 })
  await typeCombobox.click()
  await page.waitForSelector('[role="option"]', { state: "visible", timeout: 5000 })
  const quoteOption = page.getByRole("option", { name: /QUOTE/i })
  if (await quoteOption.isVisible({ timeout: 2000 }).catch(() => false)) {
    await quoteOption.click()
  } else {
    await page.getByRole("option").first().click()
  }

  // Fill customer name (required) — use name attribute selector for reliability
  await page.locator('input[name="customerName"]').fill(input.customerName ?? "E2E Test Customer")

  // Fill title
  await page.getByLabel(/^title/i).fill(input.title)

  // Classification: RadioGroup — value="existing" is the default, so only click when changing.
  if (input.classification === "new") {
    await page.locator('[role="radio"][value="new"]').click()
  } else if (input.classification === "existing") {
    // existing is the default; only click to ensure state if needed
    await page.locator('[role="radio"][value="existing"]').click()
  }

  // Urgency: Select with values low/medium/high
  if (input.urgency) {
    const urgencyValue = URGENCY_MAP[input.urgency] ?? "medium"
    // Click the SelectTrigger — accessible name is "Urgency *"
    const urgencyItem = page.getByRole("combobox", { name: /urgency/i })
    await urgencyItem.click()
    await page.getByRole("option", { name: new RegExp(`^${urgencyValue}$`, "i") }).click()
  }

  if (input.description) {
    await page.getByLabel(/description/i).fill(input.description)
  }

  // Submit form — button says "Create request"
  await page.getByRole("button", { name: /create request/i }).click()

  // Wait for dialog to close and page to update
  await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 10000 })
  await page.waitForLoadState("load")

  // The list page refreshes — find the newly created row and navigate to it
  await page.getByText(input.title).first().click({ timeout: 10000 })
  await page.waitForURL(/product-requests\/\d+/, { timeout: 10000 })
  const newUrl = page.url()
  const idMatch = newUrl.match(/product-requests\/(\d+)/)
  return idMatch?.[1] ?? ""
}

// ─── Status Transitions ───────────────────────────────────────────────────────

// B3 merge: the DRAFT "Submit" button now opens ClassificationAndFeasibilityDialog in
// mode="submit" (single SubmitAndDecide RPC — Submit + StartReview + VerifyClassification
// + DecideFeasibility + (conditional) LinkRoute, see handlers.go's SubmitAndDecide) instead
// of firing a bare submit mutation. This drives the full dialog flow: classification ->
// routing (RoutingResolver, inline, FEASIBLE only) -> feasibility -> "Submit for review".
// Final status is ROUTING_DEFINED (FEASIBLE) or REJECTED (NOT_FEASIBLE) — SubmitAndDecide's
// chain ends at DecideFeasibility, it does not stop at UNDER_REVIEW.
export interface SubmitAndDecideOptions {
  classification?: "existing" | "new"
  overrideReason?: string
  decision?: "FEASIBLE" | "NOT_FEASIBLE"
  productCode?: string
  newProductName?: string
  note?: string
}

export async function submitAndDecide(page: Page, opts: SubmitAndDecideOptions = {}) {
  const decision = opts.decision ?? "FEASIBLE"
  const btn = page.getByRole("button", { name: /^submit$/i })
  await expect(btn).toBeVisible()
  await btn.click()
  await page.waitForSelector('[role="dialog"]', { state: "visible" })

  if (decision === "NOT_FEASIBLE") {
    await page.locator('[role="radio"][value="NOT_FEASIBLE"]').click()
  }
  if (opts.note || decision === "NOT_FEASIBLE") {
    await page.getByLabel(/^note/i).fill(opts.note ?? "Test note")
  }
  if (opts.classification) {
    await page.locator(`[role="radio"][value="${opts.classification}"]`).click()
  }
  if (opts.overrideReason) {
    const overrideField = page.getByLabel(/override reason/i)
    if (await overrideField.isVisible({ timeout: 1000 }).catch(() => false)) {
      await overrideField.fill(opts.overrideReason)
    }
  }

  if (decision === "FEASIBLE") {
    await resolveRoutingInline(page, { productCode: opts.productCode, newProductName: opts.newProductName })
  }

  const submitBtn = decision === "FEASIBLE"
    ? page.getByRole("button", { name: /submit for review/i })
    : page.getByRole("button", { name: /reject as infeasible/i })
  await expect(submitBtn).toBeEnabled({ timeout: 10000 })
  await submitBtn.click()
  await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 15000 })
  await page.waitForLoadState("load")
  await expectStatus(page, decision === "FEASIBLE" ? "ROUTING_DEFINED" : "REJECTED")
}

// Direct API-bypass helpers — skip the UI for test setup steps that aren't the
// thing under test. All hit the same BFF routes the UI mutations call.
export async function submitViaApi(page: Page, requestId: string | number) {
  const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000"
  const resp = await page.request.post(`${baseUrl}/api/v1/finance/cost-product-requests/${requestId}/submit`, {
    data: {},
  })
  if (!resp.ok()) throw new Error(`submitViaApi failed: ${resp.status()} — ${await resp.text()}`)
}

export async function startReviewViaApi(page: Page, requestId: string | number) {
  const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000"
  const resp = await page.request.post(
    `${baseUrl}/api/v1/finance/cost-product-requests/${requestId}/start-review`,
    { data: {} },
  )
  if (!resp.ok()) throw new Error(`startReviewViaApi failed: ${resp.status()} — ${await resp.text()}`)
}

export async function useExistingCostingViaApi(
  page: Page,
  requestId: string | number,
  existingProductSysId: number,
) {
  const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000"
  const resp = await page.request.post(
    `${baseUrl}/api/v1/finance/cost-product-requests/${requestId}/use-existing-costing`,
    { data: { existingProductSysId } },
  )
  if (!resp.ok()) throw new Error(`useExistingCostingViaApi failed: ${resp.status()} — ${await resp.text()}`)
}

// Looks up any active product master row's sysId — avoids hardcoding a seed-data ID that
// may not exist in every environment.
export async function findAnyProductSysId(page: Page): Promise<number> {
  const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000"
  const resp = await page.request.get(`${baseUrl}/api/v1/finance/cost-product-masters?pageSize=1&activeFilter=active`)
  if (!resp.ok()) throw new Error(`findAnyProductSysId failed: ${resp.status()} — ${await resp.text()}`)
  const body = await resp.json()
  const sysId = body?.data?.[0]?.productSysId
  if (!sysId) throw new Error("findAnyProductSysId: no active product masters found in this environment")
  return sysId
}

export async function startReview(page: Page) {
  await page.getByRole("button", { name: /start review/i }).click()
  await page.waitForLoadState("load")
  await expectStatus(page, "UNDER_REVIEW")
}

// Drives RoutingResolver inline (used by both the "submitDecide" and "reviewDecide"
// variants of ClassificationAndFeasibilityDialog, and by RoutingPanel's standalone
// "Attach product routing" dialog). Only runs when the resolver form is actually
// visible — the FEASIBLE section renders it, NOT_FEASIBLE skips it entirely.
export interface ResolveRoutingOptions {
  productCode?: string
  newProductName?: string
  newProductTypeIndex?: number
}

export async function resolveRoutingInline(page: Page, opts: ResolveRoutingOptions = {}) {
  const resolveBtn = page.getByRole("button", { name: /^resolve routing$/i })
  if (!(await resolveBtn.isVisible({ timeout: 1000 }).catch(() => false))) {
    return // NOT_FEASIBLE path, or already resolved (routeLinked) — nothing to do
  }

  if (opts.newProductName) {
    const newProductCheckbox = page.locator("#rr-new-product")
    if (await newProductCheckbox.isVisible({ timeout: 1000 }).catch(() => false)) {
      await newProductCheckbox.check()
    }
    await page.getByPlaceholder(/PTY 75\/72 SD BRIGHT/i).fill(opts.newProductName)
    const typeCombobox = page.getByRole("combobox", { name: /select product type/i })
    await typeCombobox.click()
    await page.waitForSelector('[role="option"]', { state: "visible", timeout: 5000 })
    const options = page.getByRole("option")
    const idx = opts.newProductTypeIndex ?? 0
    await options.nth(idx).click()
  } else {
    const productCombobox = page.getByRole("combobox", { name: /search product by code or name/i })
    await productCombobox.click()
    await page.waitForSelector('[role="option"]', { state: "visible", timeout: 5000 })
    if (opts.productCode) {
      const searchInput = page.getByPlaceholder(/search by code or name/i)
      await searchInput.fill(opts.productCode)
      await page.waitForTimeout(400) // debounce
      await page.getByRole("option", { name: new RegExp(opts.productCode, "i") }).first().click()
    } else {
      await page.getByRole("option").first().click()
    }
  }

  await resolveBtn.click()
  // Two different hosts react differently on success: ClassificationAndFeasibilityDialog
  // keeps RoutingResolver mounted and shows a "Routing resolved — head #N…" message,
  // while RoutingPanel's standalone dialog just closes (onResolved => setResolverOpen(false)).
  // Race both signals instead of assuming either one.
  await Promise.race([
    page.getByText(/rout(e|ing) #?\d* ?resolved/i).waitFor({ state: "visible", timeout: 15000 }),
    resolveBtn.waitFor({ state: "hidden", timeout: 15000 }),
  ])
}

export async function decideFeasibility(
  page: Page,
  decision: "FEASIBLE" | "NOT_FEASIBLE",
  note = "Test note",
  routingOpts: ResolveRoutingOptions = {},
) {
  await page.getByRole("button", { name: /review.*decide/i }).click()
  await page.waitForSelector('[role="dialog"]', { state: "visible" })

  // Select decision — use value attribute to avoid /FEASIBLE/i matching both "Feasible" and "Not feasible"
  const radio = page.locator(`[role="radio"][value="${decision}"]`)
  await radio.click()

  // Fill note
  const noteField = page.getByLabel(/^note/i)
  if (await noteField.isVisible({ timeout: 1000 }).catch(() => false)) {
    await noteField.fill(note)
  }

  if (decision === "FEASIBLE") {
    await resolveRoutingInline(page, routingOpts)
  }

  // Submit label is dynamic: "Save & continue" (first pass), "Reject as infeasible"
  // (NOT_FEASIBLE), or a retry label after a partial failure.
  const submitBtn = decision === "FEASIBLE"
    ? page.getByRole("button", { name: /save.*continue|retry/i })
    : page.getByRole("button", { name: /reject as infeasible/i })
  await expect(submitBtn).toBeEnabled({ timeout: 10000 })
  await submitBtn.click()
  await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 15000 })
  await page.waitForLoadState("load")

  if (decision === "FEASIBLE") {
    await expectStatus(page, "ROUTING_DEFINED")
  } else {
    await expectStatus(page, "REJECTED")
  }
}

export async function rejectRequest(page: Page, reason: string) {
  await page.getByRole("button", { name: /^reject$/i }).click()
  await page.waitForSelector('[role="dialog"]', { state: "visible" })
  await page.getByLabel(/reason/i).fill(reason)
  await page.getByRole("button", { name: /^(confirm reject|reject)$/i }).last().click()
  await page.waitForLoadState("load")
  await expectStatus(page, "REJECTED")
}

export async function reviseRequest(page: Page) {
  await page.getByRole("button", { name: /revise.*resubmit/i }).click()
  await page.waitForLoadState("load")
  await expectStatus(page, "SUBMITTED")
}

export async function cancelRequest(page: Page, reason = "Test cancellation") {
  await page.getByRole("button", { name: /^cancel$/i }).click()
  await page.waitForSelector('[role="dialog"]', { state: "visible" })
  const reasonField = page.getByLabel(/reason/i)
  if (await reasonField.isVisible({ timeout: 1000 }).catch(() => false)) {
    await reasonField.fill(reason)
  }
  await page.getByRole("button", { name: /^(confirm|cancel request)$/i }).last().click()
  await page.waitForLoadState("load")
  await expectStatus(page, "CLOSED")
}

export async function markParametersComplete(page: Page) {
  await page.getByRole("button", { name: /mark.*parameters.*complete/i }).click()
  await page.waitForLoadState("load")
  await expectStatus(page, "PARAMETER_COMPLETE")
}

// ─── Routing ──────────────────────────────────────────────────────────────────

export interface RouteLevel {
  productCode: string
  productName: string
  stages: RouteStage[]
}

export interface RouteStage {
  stageName: string
  rms: RouteMaterial[]
}

export interface RouteMaterial {
  type: "PRODUCT" | "ITEM" | "GROUP"
  code: string
  name: string
  ratio: number
}

// Drives RoutingPanel's standalone "Attach product routing" button (shown when a
// request has no linked route yet), which opens a Dialog containing an inline
// RoutingResolver — the same component used by ClassificationAndFeasibilityDialog's
// Routing section. Does NOT navigate to a separate route editor URL; it just closes
// the dialog once RoutingResolver's onResolved fires. Returns nothing resolvable as
// a route ID from the UI — callers needing the head ID should read it from the panel
// (e.g. via `page.getByText(/route #(\d+)/i)`) or use the API directly.
export async function attachProductRouting(
  page: Page,
  fgProductName: string,
  opts: { productTypeIndex?: number } = {},
) {
  await page.getByRole("button", { name: /attach product routing/i }).click()
  await page.waitForSelector('[role="dialog"]', { state: "visible" })

  await resolveRoutingInline(page, {
    newProductName: fgProductName,
    newProductTypeIndex: opts.productTypeIndex,
  })

  await page.waitForSelector('[role="dialog"]', { state: "hidden", timeout: 15000 })
  await page.waitForLoadState("load")
}

export async function promoteRoute(page: Page) {
  // Find and click promote button in routing panel or route editor
  const promoteBtn = page.getByRole("button", { name: /promote route|promote to request/i })
  await promoteBtn.click()

  // Confirm if needed
  const confirmBtn = page.getByRole("button", { name: /^(confirm|promote)$/i }).last()
  if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await confirmBtn.click()
  }

  await page.waitForLoadState("load")
  await expectStatus(page, "PARAMETER_PENDING")
}

// ─── Fill Tasks ───────────────────────────────────────────────────────────────

export async function openFillTrackingTab(page: Page) {
  const fillTab = page.getByRole("tab", { name: /fill tracking/i })
  await expect(fillTab).toBeVisible()
  await fillTab.click()
  await page.waitForLoadState("load")
}

export async function claimFillTask(page: Page, level: number) {
  const taskRow = page.locator(`[data-testid="fill-task-level-${level}"]`)
  await expect(taskRow).toBeVisible()
  await taskRow.getByRole("button", { name: /^claim$/i }).click()
  // Wait for status to transition away from ACTIVE (TanStack Query cache invalidation + refetch)
  await expect(taskRow.locator('[data-testid="task-status"]'))
    .not.toContainText("Active", { ignoreCase: true, timeout: 10000 })
}

export async function submitFillTask(page: Page, level: number) {
  const taskRow = page.locator(`[data-testid="fill-task-level-${level}"]`)
  await taskRow.getByRole("button", { name: /^submit$/i }).click()
  // Wait for status to transition away from FILLING (TanStack Query cache invalidation + refetch)
  await expect(taskRow.locator('[data-testid="task-status"]'))
    .not.toContainText("Filling", { ignoreCase: true, timeout: 10000 })
}

export async function approveFillTask(page: Page, level: number, note = "Approved") {
  const taskRow = page.locator(`[data-testid="fill-task-level-${level}"]`)
  await taskRow.getByRole("button", { name: /^approve$/i }).click()

  // Only interact with dialog if one actually appeared (some approvals are direct mutations)
  const dialog = page.locator('[role="dialog"]')
  const hasDialog = await dialog.isVisible({ timeout: 2000 }).catch(() => false)
  if (hasDialog) {
    const noteField = page.getByLabel(/note/i)
    if (await noteField.isVisible({ timeout: 1000 }).catch(() => false)) {
      await noteField.fill(note)
    }
    await page.getByRole("button", { name: /^(confirm|approve)$/i }).last().click()
  }

  // Wait for status to transition away from APPROVAL_PENDING
  await expect(taskRow.locator('[data-testid="task-status"]'))
    .not.toContainText("Pending", { ignoreCase: true, timeout: 10000 })
}

export async function rejectFillTask(page: Page, level: number, reason: string) {
  const taskRow = page.locator(`[data-testid="fill-task-level-${level}"]`)
  await taskRow.getByRole("button", { name: /^reject$/i }).click()
  await page.getByLabel(/reason/i).fill(reason)
  await page.getByRole("button", { name: /^(confirm reject|reject)$/i }).last().click()
  // Wait for status to transition away from APPROVAL_PENDING
  await expect(taskRow.locator('[data-testid="task-status"]'))
    .not.toContainText("Pending", { ignoreCase: true, timeout: 10000 })
}

// ─── Assertions ───────────────────────────────────────────────────────────────

export async function expectStatus(page: Page, expectedStatus: string) {
  // Look for status badge — try multiple selector strategies
  const statusBadge = page.locator('[data-testid="request-status-badge"]')
    .or(page.locator('[class*="status"]').filter({ hasText: expectedStatus.replace("_", " ") }))
    .or(page.getByText(expectedStatus.replace(/_/g, " "), { exact: false }))
    .first()

  await expect(statusBadge).toBeVisible({ timeout: 8000 })
}

export async function expectButtonVisible(page: Page, name: string | RegExp) {
  await expect(page.getByRole("button", { name })).toBeVisible({ timeout: 10000 })
}

export async function expectButtonHidden(page: Page, name: string | RegExp) {
  await expect(page.getByRole("button", { name })).not.toBeVisible({ timeout: 10000 })
}

export async function expectNotificationBell(page: Page, minCount = 1) {
  const bell = page.locator('[data-testid="notification-bell"]')
  await expect(bell).toBeVisible()
  const badge = bell.locator('[data-testid="notification-badge"]')
  await expect(badge).toBeVisible({ timeout: 5000 })
  const text = await badge.textContent()
  const count = parseInt(text ?? "0", 10)
  expect(count).toBeGreaterThanOrEqual(minCount)
}

export async function expectFillTaskStatus(
  page: Page,
  level: number,
  expectedStatus: string,
) {
  const taskRow = page.locator(`[data-testid="fill-task-level-${level}"]`)
  await expect(taskRow).toBeVisible()
  await expect(taskRow.locator('[data-testid="task-status"]')).toContainText(
    expectedStatus.replace(/_/g, " "),
    { ignoreCase: true },
  )
}

// ─── Request List Helpers ─────────────────────────────────────────────────────

export async function findRequestInList(page: Page, title: string): Promise<string> {
  await gotoProductRequests(page)
  const row = page.getByRole("row").filter({ hasText: title }).first()
  await expect(row).toBeVisible({ timeout: 8000 })
  await row.click()
  await page.waitForURL(/product-requests\/\d+/)
  const match = page.url().match(/product-requests\/(\d+)/)
  return match?.[1] ?? ""
}

export async function waitForStatus(
  page: Page,
  expectedStatus: string,
  timeoutMs = 15000,
) {
  await page.waitForFunction(
    (status) => {
      const badges = document.querySelectorAll('[data-testid="request-status-badge"]')
      return Array.from(badges).some(
        (b) => b.textContent?.toLowerCase().includes(status.toLowerCase()),
      )
    },
    expectedStatus.replace(/_/g, " "),
    { timeout: timeoutMs },
  )
}
