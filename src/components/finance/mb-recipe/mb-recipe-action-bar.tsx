"use client"

// MbRecipeActionBar — status-gated workflow transition buttons for an MB Head.
//
// 🔴 USER DECISION 2026-08-26 — the workflow was SIMPLIFIED to
//   DRAFT (editable) → SUBMITTED (not editable) → APPROVED (locked)
// From SUBMITTED the only actions are Approve and Reject. Once APPROVED/locked the
// only action is Request Unlock.
//
// Two buttons were REMOVED from this bar as part of that decision:
//   - Revoke     — turning a recipe on or off is an admin concern served by the
//                  active flag, so a terminal REVOKED status is not needed.
//   - Un-approve — a locked recipe is reopened through Request Unlock instead.
//
// ⛔ The REVOKED and UN_APPROVED statuses were ⛔ NOT removed anywhere. Production
// already holds rows in both, and this bar must keep RENDERING them without crashing —
// it simply offers them no action. That is why the guard below still lists those
// statuses and why the component returns null for them rather than throwing.
//
// ⛔ The backend RPCs RevokeMBHead / UnApproveMBHead still exist (removing an RPC is a
// breaking proto change); they now refuse with a 410 BaseResponse. The hooks and API
// helpers are likewise still exported — only the buttons here are gone.
//
// 🔴 USER DECISION 2026-08-26 — "OPSI A", a SECOND change on the same day. The VALIDATE
// button was removed too, from BOTH places it appeared (the boughtout DRAFT shortcut and
// the APPROVED step), and MB Produk generation moved onto Approve.
//
// ⚠ Validate could ⛔ NOT simply be deleted on the backend. ListValidated() filters
// WHERE mbh_entry_status = 'VALIDATED', and TWO engines read it — MB Push to Head and
// Trigger MB Batch. A workflow ending at APPROVED would leave both empty forever and stop
// MB costing. So VALIDATED stays a live status: pressing APPROVE now drives the backend's
// ValidateHandler and lands the recipe DIRECTLY in VALIDATED, doing all of Validate's work
// (freeze the 8 params, bump the version, composition-sum gate, composition snapshot, MB
// product auto-gen, lock). Only the BUTTON is gone; the ValidateMBHead RPC still works.
//
// ⚠ BOUGHTOUT recipes: they used to jump DRAFT → VALIDATED through this button. With the
// button gone they travel Submit → Approve like everything else, and the backend widened
// its state map (SUBMITTED → VALIDATED) plus its Validate origin gate so that journey
// completes. ⛔ They are NOT stranded — see the boughtout cases in
// mb_head_approve_lands_validated_test.go and state_machine_test.go.
//
// ⛔ useValidateMBHead is deliberately still DEFINED and EXPORTED from
// hooks/finance/use-mb-head.ts (~:250): the ValidateMBHead RPC is alive and other callers
// may use it. What is gone is this bar's use of it — the hook is ⛔ no longer imported
// here, and the import list below is the proof.
import { useState } from "react"
import { Loader2, Unlock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { usePermissionContext } from "@/providers/permission-provider"
import { ReasonDialog } from "@/components/finance/cost-product-request/transition-dialogs"
import {
  useSubmitMBHead,
  useApproveMBHead,
  useRejectMBHead,
  useReturnMBHeadToDraft,
  useRequestUnlockMBHead,
  useGrantUnlockMBHead,
  useRejectUnlockMBHead,
} from "@/hooks/finance/use-mb-head"
import { exceedsMbCompositionTotal } from "@/lib/finance/mb-composition-total"
import type { MBHead, MBHeadEntryStatus } from "@/types/finance/mb-head"

interface Props {
  mbHead: MBHead
  // [R22] Non-carrier composition total (see mb-composition-total.ts), supplied
  // by the parent (MbRecipeDetailClient), which already fetches compositions for
  // MbCompositionTab — this bar deliberately does NOT fetch its own copy, so it
  // stays a pure presentational/status-gated component with no query dependency.
  // Omitted (undefined) is treated as "not over 100%" — the same as before this
  // gate existed — so callers that don't pass it (e.g. existing tests) are
  // unaffected.
  compositionTotalPct?: number
}

export function MbRecipeActionBar({ mbHead, compositionTotalPct }: Props) {
  const status = mbHead.entryStatus as MBHeadEntryStatus
  // 2026-08-26: ~~"unapprove" | "revoke" |~~ dropped along with their buttons.
  const [reasonDialog, setReasonDialog] = useState<
    "reject" | "return-to-draft" | "request-unlock" | "reject-unlock" | null
  >(null)

  const { hasPermission } = usePermissionContext()
  const canRejectPerm = hasPermission("finance.mb.head.reject")
  // K-30 (option A): Return to Draft reuses the existing submit permission — it hands the
  // MB Head back to whoever submits it. Deliberately NOT finance.mb.head.reject and NOT a new code.
  const canSubmitPerm = hasPermission("finance.mb.head.submit")
  // P10 (REVISED): the unlock RPCs no longer share ONE code. The user decided that a
  // requester must not be able to approve their own request, so the backend split the
  // interceptor mapping (auth_interceptor.go):
  //   RequestUnlockMBHead                     → "finance.mb.recipe.unlockrequest"  (ASK)
  //   GrantUnlockMBHead / RejectUnlockMBHead  → "finance.mb.recipe.unlock"         (DECIDE)
  // ⚠ The request code is spelled `unlockrequest` — ONE segment, no dot and no underscore
  // between "unlock" and "request". A 5-segment code is rejected by the DB CHECK constraint.
  // ⛔ Do NOT add a "is this my own request?" check anywhere: the user explicitly wants a
  // holder of the DECIDE code who requested it themselves to be able to approve it directly.
  // The permission split alone produces the requested behaviour; an identity comparison would
  // violate that decision, and the backend deliberately has none either.
  const canRequestUnlockPerm = hasPermission("finance.mb.recipe.unlockrequest")
  const canDecideUnlockPerm = hasPermission("finance.mb.recipe.unlock")

  const submitM = useSubmitMBHead()
  const approveM = useApproveMBHead()
  const rejectM = useRejectMBHead()
  const returnToDraftM = useReturnMBHeadToDraft()
  const requestUnlockM = useRequestUnlockMBHead()
  const grantUnlockM = useGrantUnlockMBHead()
  const rejectUnlockM = useRejectUnlockMBHead()

  const canSubmit = status === "DRAFT"

  // [R22] Block Submit in the UI when the composition total exceeds 100%. This is
  // a UI-side early warning, not a relaxation or replacement of the backend rule
  // ([G.5] EnforceHeadSum, sum_rule.go): that rule requires the non-carrier total
  // to equal 100% (within tolerance) and is enforced server-side, currently gated
  // behind MB_COMPOSITION_SUM_ENFORCED. This gate deliberately only fires on
  // "exceeds 100%" per R22's scope — it does not block an under-100% total, since
  // widening it to "must equal 100%" client-side would be a product decision, not
  // a bug fix (see R22 report).
  const submitBlockedByTotal = canSubmit && exceedsMbCompositionTotal(compositionTotalPct ?? 0)
  // 2026-08-26 (Opsi A): ~~canValidateDirect~~ (DRAFT + boughtout) and ~~canValidate~~
  // (APPROVED) are GONE along with the Validate button. A boughtout recipe now reaches
  // VALIDATED through Submit → Approve, exactly like an own-production one.
  //
  // UN_APPROVED is kept as an Approve origin on purpose: nothing can ENTER that status
  // any more (2026-08-26), but legacy rows already sitting there must keep their way out.
  //
  // ⚠ APPROVED is deliberately NOT added here. Removing the Validate button leaves a
  // legacy row parked in APPROVED with no forward action on this screen (Request Unlock
  // only) — the backend ValidateMBHead RPC still moves it, but nothing in the UI calls it.
  // Offering Approve on APPROVED would work technically (the backend accepts that origin),
  // but it is a NEW affordance, not part of the "remove the Validate button" decision, so
  // it is left for the user to decide rather than invented here.
  const canApprove = status === "SUBMITTED" || status === "UN_APPROVED"
  // 2026-08-26: ~~canUnApprove~~ and ~~canRevoke~~ removed — both features are gone.
  // K-2/K-25: Reject is only offered from SUBMITTED, and only to holders of
  // finance.mb.head.reject.
  const canReject = status === "SUBMITTED" && canRejectPerm
  // K-29/K-30: a REJECTED MB Head can be sent back to DRAFT, gated on finance.mb.head.submit.
  const canReturnToDraft = status === "REJECTED" && canSubmitPerm
  // P10: only the two states the backend locks on entry can park for an unlock
  // (domain canRequestUnlock: APPROVED, VALIDATED).
  const canRequestUnlock = (status === "APPROVED" || status === "VALIDATED") && canRequestUnlockPerm
  // P10: the decision pair is offered only while a request is actually parked, and only to
  // holders of the DECIDE code.
  const canDecideUnlock = status === "UNLOCK_REQUESTED" && canDecideUnlockPerm

  if (
    !canSubmit &&
    !canApprove &&
    !canReject &&
    !canReturnToDraft &&
    !canRequestUnlock &&
    !canDecideUnlock
  ) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canSubmit && (
        <div className="flex flex-col items-start gap-1">
          <Button
            size="sm"
            disabled={submitM.isPending || submitBlockedByTotal}
            onClick={() => submitM.mutate(mbHead.mbhId)}
          >
            {submitM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit
          </Button>
          {submitBlockedByTotal && (
            <span className="text-xs text-destructive font-medium">
              Composition total is {(compositionTotalPct ?? 0).toFixed(3)}%, which exceeds 100%. Fix
              the composition before submitting.
            </span>
          )}
        </div>
      )}
      {canApprove && (
        <Button size="sm" disabled={approveM.isPending} onClick={() => approveM.mutate(mbHead.mbhId)}>
          {approveM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Approve
        </Button>
      )}
      {canReject && (
        <Button size="sm" variant="destructive" onClick={() => setReasonDialog("reject")}>
          Reject
        </Button>
      )}
      {canReturnToDraft && (
        <Button size="sm" variant="outline" onClick={() => setReasonDialog("return-to-draft")}>
          Return to Draft
        </Button>
      )}
      {canRequestUnlock && (
        <Button size="sm" variant="outline" onClick={() => setReasonDialog("request-unlock")}>
          <Unlock className="mr-2 h-4 w-4" />
          Request Unlock
        </Button>
      )}
      {canDecideUnlock && (
        <Button
          size="sm"
          disabled={grantUnlockM.isPending}
          onClick={() => grantUnlockM.mutate(mbHead.mbhId)}
        >
          {grantUnlockM.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Unlock className="mr-2 h-4 w-4" />
          )}
          Grant Unlock
        </Button>
      )}
      {canDecideUnlock && (
        <Button size="sm" variant="destructive" onClick={() => setReasonDialog("reject-unlock")}>
          Reject Unlock
        </Button>
      )}

      <ReasonDialog
        open={reasonDialog === "reject"}
        onOpenChange={(o) => !o && setReasonDialog(null)}
        title="Reject MB Head"
        description="This rejects the submitted MB Head. A reason is required."
        confirmLabel="Reject"
        pending={rejectM.isPending}
        onConfirm={(reason) => {
          rejectM.mutate({ mbhId: mbHead.mbhId, reason }, { onSuccess: () => setReasonDialog(null) })
        }}
      />

      {/* K-29: reason is OPTIONAL here — reasonOptional keeps confirm enabled on an empty
          box, and an empty string is submitted so the backend retains the prior stateReason. */}
      <ReasonDialog
        open={reasonDialog === "return-to-draft"}
        onOpenChange={(o) => !o && setReasonDialog(null)}
        title="Return MB Head to Draft"
        description="This sends the rejected MB Head back to Draft for editing. A reason is optional."
        confirmLabel="Return to Draft"
        reasonOptional
        pending={returnToDraftM.isPending}
        onConfirm={(reason) => {
          returnToDraftM.mutate({ mbhId: mbHead.mbhId, reason }, { onSuccess: () => setReasonDialog(null) })
        }}
      />

      {/* P10: the request reason is MANDATORY — the domain returns ErrReasonRequired
          for an empty or whitespace-only value, so `reasonOptional` is deliberately
          NOT set here. ⛔ Granting has no dialog at all: GrantUnlockMBHeadRequest
          carries no reason field. */}
      <ReasonDialog
        open={reasonDialog === "request-unlock"}
        onOpenChange={(o) => !o && setReasonDialog(null)}
        title="Request Unlock"
        description="This asks an approver to reopen this locked recipe for editing. A reason is required."
        confirmLabel="Request Unlock"
        pending={requestUnlockM.isPending}
        onConfirm={(reason) => {
          requestUnlockM.mutate({ mbhId: mbHead.mbhId, reason }, { onSuccess: () => setReasonDialog(null) })
        }}
      />

      <ReasonDialog
        open={reasonDialog === "reject-unlock"}
        onOpenChange={(o) => !o && setReasonDialog(null)}
        title="Reject Unlock Request"
        description="This refuses the pending unlock request; the recipe stays locked and returns to its previous state. A reason is required."
        confirmLabel="Reject Unlock"
        pending={rejectUnlockM.isPending}
        onConfirm={(reason) => {
          rejectUnlockM.mutate({ mbhId: mbHead.mbhId, reason }, { onSuccess: () => setReasonDialog(null) })
        }}
      />
    </div>
  )
}
