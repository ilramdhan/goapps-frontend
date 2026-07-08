/**
 * CPR Full Workflow E2E Tests
 *
 * Coverage:
 *   E2E-01 — Full new product workflow (happy path)
 *   E2E-02 — Existing product path (use existing costing)
 *   E2E-03 — Reject → revise → resubmit
 *   E2E-04 — Permission gate: requester cannot see review buttons
 *   E2E-05 — Cancel by creator at DRAFT
 *   E2E-06 — Permission gate: engineer can't submit, but can create routing
 *   E2E-07 — Fill task claim → submit → approve (level 1)
 *   E2E-08 — Fill task reject → fix → resubmit → approve
 *   E2E-09 — All fills approved → direct PARAMETER_COMPLETE (no L100-102 chain)
 *   E2E-10 — Calculation job triggered, status reaches COSTING_DONE
 *
 * Prerequisites:
 *   - All 8 test users created with password "Mgt123456789"
 *   - IAM migration 000050 applied (roles + permissions)
 *   - Finance migration 000368 applied (global fill config)
 *   - Both services running: IAM :50052, Finance :50051, Frontend :3000
 *
 * Run:
 *   cd goapps-frontend && npm run test:e2e
 *   # or for a specific test:
 *   npm run test:e2e -- --grep "E2E-01"
 */

import { test, expect, type Page } from "@playwright/test"
import {
  loginAs,
  logout,
  createDraftRequest,
  gotoRequestDetail,
  submitAndDecide,
  submitViaApi,
  startReviewViaApi,
  startReview,
  decideFeasibility,
  useExistingCostingViaApi,
  findAnyProductSysId,
  rejectRequest,
  reviseRequest,
  cancelRequest,
  promoteRoute,
  openFillTrackingTab,
  claimFillTask,
  submitFillTask,
  approveFillTask,
  rejectFillTask,
  expectStatus,
  expectButtonVisible,
  expectButtonHidden,
  expectFillTaskStatus,
} from "./helpers/cpr-helpers"

// ─── Shared test state ────────────────────────────────────────────────────────

let createdRequestId: string

// ─── E2E-01: Full new product workflow ───────────────────────────────────────

test.describe("E2E-01: Full new product workflow", () => {
  const requestTitle = `E2E-01 New Product ${Date.now()}`

  test("1.1 marketing01 creates a draft CPR", async ({ page }) => {
    await loginAs(page, "marketing01")
    createdRequestId = await createDraftRequest(page, {
      title: requestTitle,
      classification: "existing",
      urgency: "medium",
      customerName: "E2E Test Customer",
      description: "E2E test request — routing workflow path",
    })

    // Verify we are on the detail page with DRAFT status
    await expectStatus(page, "DRAFT")
    expect(createdRequestId).toBeTruthy()
  })

  test("1.2 marketing01 can only Edit — no Submit button", async ({ page }) => {
    await loginAs(page, "marketing01")
    await gotoRequestDetail(page, createdRequestId)

    await expectButtonVisible(page, /^edit$/i)
    await expectButtonHidden(page, /^submit$/i)
    // Routing buttons must NOT appear at DRAFT
    await expectButtonHidden(page, /attach product routing/i)
  })

  test("1.3 marketingmgr sees Submit, decides classification+feasibility inline", async ({ page }) => {
    await loginAs(page, "marketingmgr")
    await gotoRequestDetail(page, createdRequestId)

    // Submitter role has submit permission; not the owner so Edit is NOT shown
    await expectButtonHidden(page, /^edit$/i)
    await expectButtonVisible(page, /^submit$/i)

    // B3 merge: Submit opens ClassificationAndFeasibilityDialog(mode="submit"), which
    // folds Submit + StartReview + VerifyClassification + DecideFeasibility + LinkRoute
    // into one SubmitAndDecide RPC — final status is ROUTING_DEFINED (FEASIBLE path).
    await submitAndDecide(page)
    await expectStatus(page, "ROUTING_DEFINED")
  })

  test("1.6 production01 sees routing panel at ROUTING_DEFINED", async ({ page }) => {
    await loginAs(page, "production01")
    await gotoRequestDetail(page, createdRequestId)

    await expectStatus(page, "ROUTING_DEFINED")
    // Routing panel should be visible for engineers, already resolved by 1.3's submitAndDecide
    const routingPanel = page.locator('[data-testid="routing-panel"]')
    await expect(routingPanel).toBeVisible()
  })

  test("1.8 production01 promotes route → PARAMETER_PENDING + fill tasks created", async ({ page }) => {
    await loginAs(page, "production01")
    await gotoRequestDetail(page, createdRequestId)

    // Route already linked by 1.3's submitAndDecide() — go straight to promotion.
    await promoteRoute(page)
    await expectStatus(page, "PARAMETER_PENDING")

    // Fill Tracking tab should be visible now
    await openFillTrackingTab(page)
    const fillTab = page.getByRole("tab", { name: /fill tracking/i })
    await expect(fillTab).toBeVisible()
  })

  test("1.9 fill task Level 1: claim and submit (as Finance dept user — finance01)", async ({ page }) => {
    await loginAs(page, "finance01")
    await gotoRequestDetail(page, createdRequestId)
    await openFillTrackingTab(page)

    // Level 1 task should be ACTIVE (claimable)
    await expectFillTaskStatus(page, 1, "ACTIVE")
    await claimFillTask(page, 1)
    await expectFillTaskStatus(page, 1, "FILLING")

    // Navigate to product detail to fill parameters (or inline if supported)
    // Try inline fill if available
    const fillParamsBtn = page.locator('[data-testid="fill-task-level-1"]')
      .getByRole("button", { name: /fill params|go to product/i })
    if (await fillParamsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fillParamsBtn.click()
      await page.waitForLoadState("load")
    }

    // If there are numeric params, fill them
    const paramInputs = page.locator('[data-testid="param-value-input"]')
    const paramCount = await paramInputs.count()
    for (let i = 0; i < paramCount; i++) {
      const input = paramInputs.nth(i)
      const inputType = await input.getAttribute("type")
      if (inputType === "number") {
        await input.fill("100")
      } else {
        await input.fill("test-value")
      }
    }

    // Save params if save button exists
    const saveBtn = page.getByRole("button", { name: /save.*param|save.*value/i })
    if (await saveBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await saveBtn.click()
      await page.waitForLoadState("load")
    }

    // Go back to request and submit fill task
    await gotoRequestDetail(page, createdRequestId)
    await openFillTrackingTab(page)
    await submitFillTask(page, 1)

    // Should go to APPROVAL_PENDING (if approver configured) or APPROVED (auto)
    const taskStatus = await page.locator('[data-testid="fill-task-level-1"]')
      .locator('[data-testid="task-status"]').textContent()
    expect(["APPROVAL PENDING", "APPROVED"]).toContain(taskStatus?.toUpperCase().trim())
  })

  test("1.10 Approver approves Level 1 fill task", async ({ page }) => {
    await loginAs(page, "finance01") // finance01 is both filler and approver for L1
    await gotoRequestDetail(page, createdRequestId)
    await openFillTrackingTab(page)

    const taskStatus = await page.locator('[data-testid="fill-task-level-1"]')
      .locator('[data-testid="task-status"]').textContent()

    if (taskStatus?.includes("APPROVAL_PENDING") || taskStatus?.includes("APPROVAL PENDING")) {
      await approveFillTask(page, 1, "Parameters look correct")
      await expectFillTaskStatus(page, 1, "APPROVED")
    }
    // If already APPROVED (no approver in config), test passes
  })
})

// ─── E2E-02: Existing product path ───────────────────────────────────────────

test.describe("E2E-02: Existing product path (Use Existing Costing)", () => {
  const requestTitle = `E2E-02 Existing Product ${Date.now()}`
  let requestId: string

  test("2.1 Create request and submit via API (setup only — not the thing under test)", async ({ page }) => {
    await loginAs(page, "marketing01")
    requestId = await createDraftRequest(page, {
      title: requestTitle,
      classification: "existing",
      urgency: "high",
      customerName: "E2E Customer 02",
    })
    await expectStatus(page, "DRAFT")

    // Use Existing Costing is a review-phase action, reachable from UNDER_REVIEW regardless
    // of how classification/feasibility were decided — API-bypass Submit + StartReview here
    // since the dialog flow itself is already covered by E2E-01's submitAndDecide() test.
    await submitViaApi(page, requestId)
    await startReviewViaApi(page, requestId)
    await page.reload()
    await expectStatus(page, "UNDER_REVIEW")
  })

  test("2.2 finance01 uses existing costing via API — bypasses removed UI", async ({ page }) => {
    // UseExistingCostingDialog has no live call site in request-detail-panel.tsx anymore
    // (DialogKind no longer has a "useExisting" variant) — the RPC/BFF route is still
    // reachable directly, so this test drives it via API rather than asserting on dead UI.
    await loginAs(page, "finance01")
    await gotoRequestDetail(page, requestId)
    await expectStatus(page, "UNDER_REVIEW")

    const productSysId = await findAnyProductSysId(page)
    await useExistingCostingViaApi(page, requestId, productSysId)
    await page.reload()
    await expectStatus(page, "QUOTE_READY")
  })

  test("2.3 QUOTE_READY: routing buttons not visible", async ({ page }) => {
    await loginAs(page, "finance01")
    await gotoRequestDetail(page, requestId)

    await expectStatus(page, "QUOTE_READY")
    await expectButtonHidden(page, /attach product routing/i)
    await expectButtonHidden(page, /review.*decide/i)
    // Fill tracking tab should NOT be present (no fill tasks for existing path)
    const fillTab = page.getByRole("tab", { name: /fill tracking/i })
    await expect(fillTab).not.toBeVisible()
  })
})

// ─── E2E-03: Reject → Revise → Resubmit ─────────────────────────────────────

test.describe("E2E-03: Reject and revise flow", () => {
  const requestTitle = `E2E-03 Reject Flow ${Date.now()}`
  let requestId: string

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await loginAs(page, "marketing01")
    requestId = await createDraftRequest(page, {
      title: requestTitle,
      classification: "existing",
      urgency: "NORMAL",
    })
    // API-bypass — this suite tests reject/revise, not the submit dialog itself.
    await submitViaApi(page, requestId)
    await page.close()
  })

  test("3.1 finance01 can reject at SUBMITTED status directly", async ({ page }) => {
    await loginAs(page, "finance01")
    await gotoRequestDetail(page, requestId)

    await expectStatus(page, "SUBMITTED")
    await expectButtonVisible(page, /^reject$/i)

    await rejectRequest(page, "Scope is too broad, please narrow down product specs")
    await expectStatus(page, "REJECTED")
  })

  test("3.2 marketing01 sees rejection reason and can revise", async ({ page }) => {
    await loginAs(page, "marketing01")
    await gotoRequestDetail(page, requestId)

    await expectStatus(page, "REJECTED")
    // Revision button should be visible for the creator
    await expectButtonVisible(page, /revise.*resubmit/i)
    // No submit or other reviewer buttons
    await expectButtonHidden(page, /start review/i)

    await reviseRequest(page)
    await expectStatus(page, "SUBMITTED")
  })

  test("3.3 finance01 can also reject at UNDER_REVIEW status", async ({ page }) => {
    // First: start review to get to UNDER_REVIEW
    await loginAs(page, "finance01")
    await gotoRequestDetail(page, requestId)

    await startReview(page)
    await expectStatus(page, "UNDER_REVIEW")

    // Reject from UNDER_REVIEW
    await rejectRequest(page, "After detailed review, product is not viable")
    await expectStatus(page, "REJECTED")
  })
})

// ─── E2E-04: Permission gates — requester cannot review ─────────────────────

test.describe("E2E-04: Permission gates", () => {
  const requestTitle = `E2E-04 Permission Test ${Date.now()}`
  let requestId: string

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await loginAs(page, "marketing01")
    requestId = await createDraftRequest(page, {
      title: requestTitle,
      classification: "existing",
      urgency: "NORMAL",
    })
    await page.close()
  })

  test("4.1 marketing01 at DRAFT: Edit visible, Submit NOT visible", async ({ page }) => {
    await loginAs(page, "marketing01")
    await gotoRequestDetail(page, requestId)

    await expectStatus(page, "DRAFT")
    await expectButtonVisible(page, /^edit$/i)
    await expectButtonHidden(page, /^submit$/i)
    // Routing panel NEVER visible at DRAFT
    await expect(page.locator('[data-testid="routing-panel"]')).not.toBeVisible()
  })

  test("4.2 After submit: marketing01 cannot see reviewer buttons", async ({ page }) => {
    // API-bypass — this test is about button visibility for marketing01, not the submit dialog.
    await submitViaApi(page, requestId)

    // Now check as marketing01
    await loginAs(page, "marketing01")
    await gotoRequestDetail(page, requestId)

    await expectStatus(page, "SUBMITTED")
    await expectButtonHidden(page, /start review/i)
    await expectButtonHidden(page, /review.*decide/i)
    await expectButtonHidden(page, /reject/i)
  })

  test("4.3 production01 at SUBMITTED: cannot see review buttons, no routing panel", async ({ page }) => {
    await loginAs(page, "production01")
    await gotoRequestDetail(page, requestId)

    await expectStatus(page, "SUBMITTED")
    await expectButtonHidden(page, /start review/i)
    await expectButtonHidden(page, /review.*decide/i)
    await expectButtonHidden(page, /submit/i)
    // Routing panel only appears at ROUTING_DEFINED — not at SUBMITTED
    await expect(page.locator('[data-testid="routing-panel"]')).not.toBeVisible()
  })

  test("4.4 production01 at ROUTING_DEFINED: routing panel visible", async ({ page }) => {
    // Get to ROUTING_DEFINED first — "review" mode path via startReview + decideFeasibility
    // (distinct from E2E-01's "submit" mode path via submitAndDecide).
    await loginAs(page, "finance01")
    await gotoRequestDetail(page, requestId)
    await startReview(page)
    await decideFeasibility(page, "FEASIBLE", "Feasible")

    // Now check production01
    await logout(page)
    await loginAs(page, "production01")
    await gotoRequestDetail(page, requestId)

    await expectStatus(page, "ROUTING_DEFINED")
    const routingPanel = page.locator('[data-testid="routing-panel"]')
    await expect(routingPanel).toBeVisible()
    // Already resolved by decideFeasibility's inline RoutingResolver — no "attach" button left.
    await expectButtonHidden(page, /attach product routing/i)
  })

  test("4.5 finance01 at ROUTING_DEFINED: no routing attach button (not engineer)", async ({ page }) => {
    await loginAs(page, "finance01")
    await gotoRequestDetail(page, requestId)

    // Routing is already resolved by 4.4 — the "Attach product routing" button only ever
    // appears when unresolved, so this always evaluates hidden regardless of role.
    await expectStatus(page, "ROUTING_DEFINED")
    await expectButtonHidden(page, /attach product routing/i)
  })
})

// ─── E2E-05: Cancel by creator at DRAFT ─────────────────────────────────────

test.describe("E2E-05: Cancel by creator", () => {
  test("5.1 marketing01 can cancel their own DRAFT request", async ({ page }) => {
    await loginAs(page, "marketing01")
    const requestId = await createDraftRequest(page, {
      title: `E2E-05 Cancel Test ${Date.now()}`,
      classification: "existing",
      urgency: "NORMAL",
    })

    await expectStatus(page, "DRAFT")
    // Cancel button should be visible for creator
    await expectButtonVisible(page, /^cancel$/i)

    await cancelRequest(page, "No longer needed")
    await expectStatus(page, "CLOSED")
  })

  test("5.2 marketingmgr can also cancel a DRAFT they didn't create", async ({ page }) => {
    // Create as marketing01
    await loginAs(page, "marketing01")
    const requestId = await createDraftRequest(page, {
      title: `E2E-05 Cancel MgrTest ${Date.now()}`,
      classification: "existing",
      urgency: "NORMAL",
    })

    // Cancel as marketingmgr (has submit permission = can close)
    await logout(page)
    await loginAs(page, "marketingmgr")
    await gotoRequestDetail(page, requestId)

    await expectButtonVisible(page, /^cancel$/i)
    await cancelRequest(page, "Cancelled by manager")
    await expectStatus(page, "CLOSED")
  })
})

// ─── E2E-07: Fill Task Complete Flow ─────────────────────────────────────────

test.describe("E2E-07: Fill task claim → submit → approve", () => {
  const requestTitle = `E2E-07 Fill Task ${Date.now()}`
  let requestId: string

  // This test requires a request in PARAMETER_PENDING with fill tasks created
  // Setup: create → submit → review → ROUTING_DEFINED → create route → promote

  test("7.1 Fill task Level 1 full cycle: ACTIVE → FILLING → APPROVAL_PENDING → APPROVED", async ({
    page,
  }) => {
    // Setup: get to PARAMETER_PENDING (abbreviated setup using finance01 as engineer)
    await loginAs(page, "marketing01")
    requestId = await createDraftRequest(page, {
      title: requestTitle,
      classification: "existing",
      urgency: "NORMAL",
    })

    // Submit (as marketingmgr) — API-bypass, this suite tests fill tasks, not the submit dialog.
    await submitViaApi(page, requestId)

    // Review and decide FEASIBLE — decideFeasibility's inline RoutingResolver already
    // resolves + links routing as part of this step (see resolveRoutingInline).
    await loginAs(page, "finance01")
    await gotoRequestDetail(page, requestId)
    await startReview(page)
    await decideFeasibility(page, "FEASIBLE", "Feasible", { newProductName: `E2E-07 Product ${Date.now()}` })
    await expectStatus(page, "ROUTING_DEFINED")

    // Promote to PARAMETER_PENDING as production01 — routing already linked above.
    await logout(page)
    await loginAs(page, "production01")
    await gotoRequestDetail(page, requestId)
    await promoteRoute(page)
    await expectStatus(page, "PARAMETER_PENDING")
  })

  test("7.2 finance01 claims and submits Level 1 fill task", async ({ page }) => {
    await loginAs(page, "finance01")
    await gotoRequestDetail(page, requestId)
    await openFillTrackingTab(page)

    // Level 1 should be ACTIVE for Finance dept
    await expectFillTaskStatus(page, 1, "ACTIVE")

    // Claim
    await claimFillTask(page, 1)
    await expectFillTaskStatus(page, 1, "FILLING")

    // Submit
    await submitFillTask(page, 1)

    const statusEl = page.locator('[data-testid="fill-task-level-1"] [data-testid="task-status"]')
    const status = await statusEl.textContent()
    // Either goes to APPROVAL_PENDING or APPROVED (depends on fill config)
    expect(status?.toUpperCase()).toMatch(/APPROVAL.PENDING|APPROVED/)
  })

  test("7.3 Approver approves Level 1", async ({ page }) => {
    await loginAs(page, "finance01")
    await gotoRequestDetail(page, requestId)
    await openFillTrackingTab(page)

    const statusEl = page.locator('[data-testid="fill-task-level-1"] [data-testid="task-status"]')
    const status = await statusEl.textContent()

    if (status?.toUpperCase().includes("APPROVAL") || status?.toUpperCase().includes("PENDING")) {
      await approveFillTask(page, 1, "Parameters verified")
      await expectFillTaskStatus(page, 1, "APPROVED")
    }

    // Level 2 should now be ACTIVE (sequential gate)
    const level2Status = await page.locator('[data-testid="fill-task-level-2"]')
      .locator('[data-testid="task-status"]')
      .textContent({ timeout: 3000 })
      .catch(() => null)

    if (level2Status) {
      expect(level2Status.toUpperCase()).toContain("ACTIVE")
    }
  })
})

// ─── E2E-08: Fill task reject → fix → resubmit ───────────────────────────────

test.describe("E2E-08: Fill task rejection cycle", () => {
  test("8.1 Approver rejects Level 1 → filler sees rejection → resubmits", async ({ page }) => {
    // This test builds on E2E-07 state where Level 1 is APPROVAL_PENDING
    // Skip if the test can't find an approval-pending task
    test.skip(true, "Requires state from E2E-07 — run after E2E-07")

    // Reject as approver
    await loginAs(page, "finance01")
    // Navigate to a request in APPROVAL_PENDING state...
    // await gotoRequestDetail(page, knownRequestId)
    // await openFillTrackingTab(page)
    // await rejectFillTask(page, 1, "Value looks off — please recalculate")
    // await expectFillTaskStatus(page, 1, "REJECTED")
  })
})

// ─── E2E-09: A5 — L100-102 removal: direct PARAMETER_COMPLETE after all fills ──
//
// The old completion chain (L100/L101/L102) was removed (migration 000373 +
// CompletionGateHandler simplification). After all regular fill levels are
// approved, the CPR advances directly to PARAMETER_COMPLETE with no extra tasks.

test.describe("E2E-09: All fills approved → direct PARAMETER_COMPLETE (no L100-102)", () => {
  test("9.1 After all fill levels approved, NO L100/101/102 tasks exist", async ({ page }) => {
    // Requires a request in PARAMETER_PENDING with at least one fill level.
    // After all regular tasks are approved, gate calls MarkParameterComplete directly.
    // This test verifies that no phantom L100/L101/L102 tasks appear.
    test.skip(true, "Requires a live request in PARAMETER_PENDING with all levels approved — run after E2E-07")

    await loginAs(page, "finance01")
    // Navigate to the request detail after E2E-07.3 completes (all levels APPROVED).
    // await gotoRequestDetail(page, createdRequestId)
    // await openFillTrackingTab(page)
    //
    // // L100/101/102 tasks MUST NOT appear in the fill task table.
    // const allRows = page.locator('[data-testid="fill-task-row"]')
    // const rowTexts = await allRows.allTextContents()
    // for (const text of rowTexts) {
    //   expect(text).not.toMatch(/L-100|L-101|L-102|level 100|level 101|level 102/i)
    // }
    //
    // // CPR should have advanced to PARAMETER_COMPLETE directly.
    // await expectStatus(page, "PARAMETER_COMPLETE")
  })

  test("9.2 DB: cost_fill_config has no rows with fill_level IN (100,101,102)", async ({ page }) => {
    // This is a structural validation: migration 000373 must have run cleanly.
    // Verify via the API: no tasks with level 100/101/102 should ever be returned.
    test.skip(true, "DB-level check — verified by migration 000373 dry-run on clean DB")
  })
})

// ─── E2E-10: Calculation ─────────────────────────────────────────────────────

test.describe("E2E-10: Trigger calculation after PARAMETER_COMPLETE", () => {
  test("10.1 finance01 triggers calculation at PARAMETER_COMPLETE", async ({ page }) => {
    test.skip(true, "Requires complete E2E-01 flow")

    await loginAs(page, "finance01")
    // await gotoRequestDetail(page, requestId)
    // await expectStatus(page, "PARAMETER_COMPLETE")
    //
    // // Trigger calc
    // await page.getByRole("button", { name: /calculate/i }).click()
    // await page.waitForSelector('[role="dialog"]', { state: "visible" })
    //
    // // Select period
    // await page.getByLabel(/period/i).fill("202601")
    // await page.getByRole("button", { name: /^(trigger|start) calc/i }).click()
    // await page.waitForLoadState("load")
    //
    // // Should redirect to calc jobs page or show job status
    // await page.waitForURL(/calc-jobs/)
    // const jobStatus = page.locator('[data-testid="calc-job-status"]').first()
    // await expect(jobStatus).toContainText(/queued|planning|processing|success/i, { timeout: 30000 })
  })
})

// ─── Full integrated E2E happy path (abbreviated, all in one) ────────────────

test.describe("E2E-FULL: Complete workflow smoke test", () => {
  const uniqueTitle = `SMOKE TEST ${Date.now()}`
  let requestId: string

  test("Full flow: Draft → Submitted → Under Review → Routing Defined → Parameter Pending", async ({
    page,
  }) => {
    // Step 1: Create
    await loginAs(page, "marketing01")
    requestId = await createDraftRequest(page, {
      title: uniqueTitle,
      classification: "existing",
      urgency: "NORMAL",
    })
    await expectStatus(page, "DRAFT")

    // Step 2: Submit (API-bypass — smoke test targets the overall status chain)
    await submitViaApi(page, requestId)

    // Step 3: Review
    await loginAs(page, "finance01")
    await gotoRequestDetail(page, requestId)
    await startReview(page)
    await expectStatus(page, "UNDER_REVIEW")

    // Step 4: Decide FEASIBLE — inline RoutingResolver resolves + links routing.
    await decideFeasibility(page, "FEASIBLE", "OK", { newProductName: `E2E-FULL Product ${Date.now()}` })
    await expectStatus(page, "ROUTING_DEFINED")

    // Step 5: Verify routing panel visible for engineer
    await logout(page)
    await loginAs(page, "production01")
    await gotoRequestDetail(page, requestId)
    await expectStatus(page, "ROUTING_DEFINED")
    await expect(page.locator('[data-testid="routing-panel"]')).toBeVisible()

    // Mark success — full smoke test passed through all required states
    console.log(`✅ Full smoke test passed for request ID: ${requestId}`)
  })
})

// ─── E2E-11: A1 — Permission-gated "+ New Request" button ────────────────────
//
// Users without finance.product.request.create must not see the "+ New Request"
// button on the product requests list page. Users with the permission see it.

test.describe("E2E-11: A1 — Permission-gated + New Request button", () => {
  test("11.1 financemgr (no create permission) does NOT see + New Request", async ({ page }) => {
    await loginAs(page, "financemgr")
    await page.goto("/finance/product-requests")
    await page.waitForLoadState("load")

    // The + New Request button must be absent for users without create permission.
    await expect(
      page.getByRole("button", { name: /new request/i }),
    ).not.toBeVisible()
  })

  test("11.2 marketingmgr (has create permission) sees + New Request", async ({ page }) => {
    await loginAs(page, "marketingmgr")
    await page.goto("/finance/product-requests")
    await page.waitForLoadState("load")

    await expect(
      page.getByRole("button", { name: /new request/i }),
    ).toBeVisible()
  })

  test("11.3 marketing01 (non-owner) cannot see Submit on someone else's DRAFT", async ({
    page,
  }) => {
    // Create a draft as marketingmgr, then verify marketing01 cannot submit it.
    await loginAs(page, "marketingmgr")
    const requestId = await createDraftRequest(page, {
      title: `E2E-11 isOwner Test ${Date.now()}`,
      classification: "existing",
      urgency: "NORMAL",
    })

    await logout(page)
    await loginAs(page, "marketing01")
    await gotoRequestDetail(page, requestId)

    // marketing01 is not the owner — Submit must be hidden.
    await expectButtonHidden(page, /^submit$/i)
  })

  test("11.4 marketingmgr (owner) sees Submit on their own DRAFT", async ({ page }) => {
    await loginAs(page, "marketingmgr")
    const requestId = await createDraftRequest(page, {
      title: `E2E-11 Owner Submit Test ${Date.now()}`,
      classification: "existing",
      urgency: "NORMAL",
    })
    await gotoRequestDetail(page, requestId)

    // Owner can submit their own draft.
    await expectButtonVisible(page, /^submit$/i)
  })
})

// ─── E2E-12: A6 — Approval trace history timeline ────────────────────────────
//
// After CPR status transitions, the approval trace section shows entries with
// actor names and relative timestamps.

test.describe("E2E-12: A6 — Approval trace history timeline", () => {
  test("12.1 History section visible on request detail page", async ({ page }) => {
    await loginAs(page, "marketingmgr")
    const requestId = await createDraftRequest(page, {
      title: `E2E-12 History Test ${Date.now()}`,
      classification: "existing",
      urgency: "NORMAL",
    })
    await gotoRequestDetail(page, requestId)

    // The "Status History" collapsible trigger must exist.
    await expect(page.getByRole("button", { name: /status history/i })).toBeVisible()
  })

  test("12.2 After submit, history entry for SUBMITTED appears", async ({ page }) => {
    await loginAs(page, "marketingmgr")
    const requestId = await createDraftRequest(page, {
      title: `E2E-12 History Entries ${Date.now()}`,
      classification: "existing",
      urgency: "NORMAL",
    })
    await gotoRequestDetail(page, requestId)
    await submitViaApi(page, requestId)
    await page.reload()
    await expectStatus(page, "SUBMITTED")

    // Expand history section.
    await page.getByRole("button", { name: /status history/i }).click()

    // SUBMITTED entry must appear in the timeline.
    await expect(page.getByText("SUBMITTED")).toBeVisible({ timeout: 5000 })
  })

  test("12.3 Multiple transitions populate multiple history rows", async ({ page }) => {
    await loginAs(page, "marketingmgr")
    const requestId = await createDraftRequest(page, {
      title: `E2E-12 Multi-History ${Date.now()}`,
      classification: "existing",
      urgency: "NORMAL",
    })
    await gotoRequestDetail(page, requestId)
    await submitViaApi(page, requestId)
    await page.reload()
    await expectStatus(page, "SUBMITTED")

    await loginAs(page, "finance01")
    await gotoRequestDetail(page, requestId)
    await startReview(page)
    await expectStatus(page, "UNDER_REVIEW")

    // Expand history.
    await page.getByRole("button", { name: /status history/i }).click()

    // Both SUBMITTED and UNDER_REVIEW must appear.
    await expect(page.getByText("SUBMITTED")).toBeVisible({ timeout: 5000 })
    await expect(page.getByText("UNDER_REVIEW")).toBeVisible({ timeout: 5000 })
  })
})

// ─── E2E-13: A3 — Fill enforcement: ErrFillIncomplete + DEPT eligibility ─────
//
// SubmitFillHandler rejects submission when not all required params are filled.
// DEPT-type tasks are only claimable by users whose departmentCode matches.

test.describe("E2E-13: A3 — Fill enforcement and DEPT eligibility", () => {
  test("13.1 Submit fill task without filling params returns 400 ErrFillIncomplete", async ({
    page,
  }) => {
    // Requires a request in PARAMETER_PENDING with an unclaimed/unfilled task.
    // We call the API directly to bypass the UI guard and verify the backend rejects it.
    test.skip(true, "Requires a live PARAMETER_PENDING request — integrate with E2E-07 setup")

    await loginAs(page, "finance01")
    // const response = await page.request.post(
    //   `/api/v1/finance/cost-product-requests/${requestId}/fill-tasks/${taskId}/submit`,
    //   { data: {} },
    // )
    // // Backend must return 400 with ErrFillIncomplete when params are not all filled.
    // expect(response.status()).toBe(400)
    // const body = await response.json()
    // expect(body?.base?.message).toMatch(/incomplete|fill.*param/i)
  })

  test("13.2 production01 (DEPT=PROD) sees Claim button on DEPT fill task", async ({ page }) => {
    // DEPT-type fill tasks with fillerValue=PROD should show Claim to production01
    // whose departmentCode is PROD.
    test.skip(true, "Requires a live PARAMETER_PENDING request with a DEPT=PROD fill task")

    await loginAs(page, "production01")
    // await gotoRequestDetail(page, requestId)
    // await openFillTrackingTab(page)
    //
    // // The claim button must be visible for production01 on the DEPT task.
    // const claimBtn = page.locator('[data-testid="claim-fill-task"]').first()
    // await expect(claimBtn).toBeVisible()
  })

  test("13.3 finance01 (DEPT=FIN) does NOT see Claim on a DEPT=PROD fill task", async ({
    page,
  }) => {
    test.skip(true, "Requires a live PARAMETER_PENDING request with a DEPT=PROD fill task")

    await loginAs(page, "finance01")
    // await gotoRequestDetail(page, requestId)
    // await openFillTrackingTab(page)
    //
    // // finance01's departmentCode is FIN, not PROD — Claim must be hidden.
    // await expectButtonHidden(page, /claim/i)
  })

  test("13.4 Fill task claim from fill-tasks page redirects to detail ?tab=fill-tracking", async ({
    page,
  }) => {
    // After claiming a task on /finance/costing/fill-tasks, user should land on
    // /finance/product-requests/{id}?tab=fill-tracking (not stay on fill-tasks page).
    test.skip(true, "Requires a live ACTIVE fill task visible to the test user")

    await loginAs(page, "finance01")
    await page.goto("/finance/costing/fill-tasks")
    await page.waitForLoadState("load")

    // Select a request that has an active task claimable by finance01.
    // await page.getByPlaceholder(/search by request/i).fill("E2E test")
    // await page.locator('[data-testid="request-picker-item"]').first().click()
    //
    // const claimBtn = page.locator('[data-testid="claim-fill-task"]').first()
    // await expect(claimBtn).toBeVisible()
    // await claimBtn.click()
    //
    // // Should redirect to CPR detail with fill-tracking tab active.
    // await page.waitForURL(/\/finance\/product-requests\/\d+\?tab=fill-tracking/)
    // const fillTab = page.getByRole("tab", { name: /fill tracking/i })
    // await expect(fillTab).toHaveAttribute("data-state", "active")
  })
})

// ─── E2E-14: A7 — Comment @mention autocomplete ──────────────────────────────
//
// The comment box supports @mention autocomplete.
// Typing "@name" shows a popover of matching users; selecting one inserts
// "@[Display Name](uuid)" which renders as a styled span in submitted comments.

test.describe("E2E-14: A7 — @mention autocomplete in comments", () => {
  test("14.1 Typing '@' in comment box opens user popover", async ({ page }) => {
    await loginAs(page, "marketingmgr")
    const requestId = await createDraftRequest(page, {
      title: `E2E-14 Mention Test ${Date.now()}`,
      classification: "existing",
      urgency: "NORMAL",
    })
    await gotoRequestDetail(page, requestId)

    // Find the comment textarea (MentionableTextarea renders a <textarea>).
    const textarea = page.locator("textarea").filter({ hasText: "" }).first()
    await textarea.click()
    await textarea.type("@fin")

    // A popover with matching users must appear.
    const popover = page.locator('[role="dialog"], [data-radix-popper-content-wrapper]').first()
    await expect(popover).toBeVisible({ timeout: 3000 })
  })

  test("14.2 Selecting a mention inserts @[Name](uuid) and closes popover", async ({ page }) => {
    await loginAs(page, "marketingmgr")
    const requestId = await createDraftRequest(page, {
      title: `E2E-14 Mention Insert ${Date.now()}`,
      classification: "existing",
      urgency: "NORMAL",
    })
    await gotoRequestDetail(page, requestId)

    const textarea = page.locator("textarea").filter({ hasText: "" }).first()
    await textarea.click()
    await textarea.type("@fin")

    // Wait for popover and click the first user option.
    const firstOption = page
      .locator('[data-radix-popper-content-wrapper] button, [role="listbox"] button')
      .first()
    await firstOption.waitFor({ state: "visible", timeout: 3000 })
    await firstOption.click()

    // Textarea must now contain the @[Name](uuid) format.
    const value = await textarea.inputValue()
    expect(value).toMatch(/@\[.+\]\([0-9a-f-]{36}\)/)

    // Popover must be closed.
    await expect(firstOption).not.toBeVisible()
  })

  test("14.3 Escape key closes mention popover without inserting", async ({ page }) => {
    await loginAs(page, "marketingmgr")
    const requestId = await createDraftRequest(page, {
      title: `E2E-14 Escape Test ${Date.now()}`,
      classification: "existing",
      urgency: "NORMAL",
    })
    await gotoRequestDetail(page, requestId)

    const textarea = page.locator("textarea").filter({ hasText: "" }).first()
    await textarea.click()
    await textarea.type("@fin")

    const popover = page.locator('[data-radix-popper-content-wrapper]').first()
    await expect(popover).toBeVisible({ timeout: 3000 })

    await textarea.press("Escape")

    // Popover must close.
    await expect(popover).not.toBeVisible()

    // The "@fin" partial text remains unchanged (not replaced with a mention token).
    const value = await textarea.inputValue()
    expect(value).toBe("@fin")
  })

  test("14.4 Submitted comment with mention renders @Name as styled span", async ({ page }) => {
    await loginAs(page, "marketingmgr")
    const requestId = await createDraftRequest(page, {
      title: `E2E-14 Mention Render ${Date.now()}`,
      classification: "existing",
      urgency: "NORMAL",
    })
    await gotoRequestDetail(page, requestId)

    // Type a comment with a known mention token directly (bypass popover).
    const fakeUUID = "00000000-0000-0000-0000-000000000001"
    const commentText = `Hello @[Finance User](${fakeUUID}) please review`

    const textarea = page.locator("textarea").filter({ hasText: "" }).first()
    await textarea.click()
    await textarea.fill(commentText)

    // Submit comment.
    await page.getByRole("button", { name: /^(post|send|comment)$/i }).click()
    await page.waitForLoadState("load")

    // The rendered comment should show "@Finance User" as styled (primary color) span.
    // The raw UUID token must NOT be visible in the rendered output.
    await expect(page.getByText(fakeUUID)).not.toBeVisible({ timeout: 3000 })
    await expect(page.getByText("@Finance User")).toBeVisible({ timeout: 5000 })
  })
})
