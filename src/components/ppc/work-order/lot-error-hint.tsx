"use client"

// LotErrorHint — turns a lot-generation failure from the PPC backend into an
// inline, actionable alert with a link to the master that fixes it.
//
// The backend already names the specific cause in words (services/ppc
// internal/domain/workorder/lot_errors.go split one vague ErrLotSpecUnavailable
// into three), so this component does NOT re-word the message — re-wording would
// drift from the server the moment either side changes. It classifies the
// message just far enough to attach the right link, and shows the server's own
// sentence verbatim underneath.
//
// A toast cannot carry a link the user can read at leisure, and the failure is
// one the planner has to leave the dialog to fix, so it renders in the form.
//
// WHY MATCHING ON PROSE IS SAFE HERE (it normally is not):
// BaseResponse carries only { message, statusCode } — there is no structured
// cause field to read, so text is the only signal available. The backend
// therefore treats each phrase below as a CONTRACT: they are exported constants
// (workorder.CausePhrase*) and TestLotCausePhrases_AreMutuallyExclusive asserts
// each one appears in EXACTLY ONE rendered message, fix hints included.
//
// That exclusivity is what makes this sound, and it is not theoretical: the
// first version of this file matched `includes("lot master")`, which also
// matched the "plan item is not linked to a product" failure — whose fix hint
// ends "...or enter a lot number already registered in lot master". The one
// failure no master page can fix was getting a confident link to Lot Master.
//
// Two consequences of the contract, both relied on below:
//   1. match ORDER cannot change the outcome, so no general branch can shadow a
//      specific one (the branches are still ordered most-specific-first as
//      defence in depth, but correctness does not depend on it);
//   2. rewording a phrase fails TestCausePhraseLiterals_AreFrozen on the Go
//      side, whose failure message names THIS FILE as the second edit site.
//
// BE PRECISE ABOUT WHAT (2) DOES AND DOES NOT GUARANTEE.
// The constants below are a HAND-MAINTAINED COPY of the Go ones. There is no
// codegen and no shared JSON — nothing mechanically binds them. Exclusivity
// alone would not have protected this file: a reword applied consistently across
// the Go side keeps exclusivity intact, and the test fixtures in
// __tests__/ppc/lot-error-hint.test.ts are themselves hardcoded, so they would
// go on passing against a stale copy while production silently lost the link.
//
// The frozen-literal test is what makes the duplication a DECLARED two-site
// edit instead of an invisible one. It cannot update this file for you; it can
// only guarantee nobody reaches production without being told to. So: if you
// change a phrase here, change it in lot_errors.go and in that test's expected
// literals, in the same commit. If you add a branch, add its phrase to
// LotCausePhrases and freeze it there too.

import Link from "next/link"
import { AlertCircle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

/** A master page a lot failure can point the planner at. */
interface FixRoute {
  href: string
  label: string
}

// ERP item code and shade code live on cost_product_master, so the page that
// fixes them is the product master — NOT /finance/master/parameter, which edits
// mst_parameter definitions and cannot set an item code on a product.
const PRODUCT_MASTER: FixRoute = {
  href: "/finance/product-master",
  label: "Open Product Master",
}
// STD_WEIGHT is a parameter value, resolved through the product+machine layer.
const PRODUCT_MACHINE_PARAMETERS: FixRoute = {
  href: "/production-plan/masters/product-machine-parameters",
  label: "Open Product Machine Parameters",
}
const LOT_MASTER: FixRoute = {
  href: "/production-plan/masters/lots",
  label: "Open Lot Master",
}

// Cause phrases, mirroring the exported Go constants one-for-one (lowercased,
// since matching is case-insensitive).
// services/ppc/internal/domain/workorder/lot_errors.go
const CAUSE_ITEM_SHADE = "no erp item code and shade code"
const CAUSE_STD_WEIGHT = "standard bobbin weight (std_weight) is not set"
const CAUSE_NO_PRODUCT = "plan item is not linked to a product"
const CAUSE_LOT_NOT_REGISTERED = "lot number is not registered in lot master"
// Raised when the server has no lot provisioner wired — a deployment fault, not
// missing master data. Included because the planner's workaround is still a
// master action (enter an existing lot), so Lot Master is the right destination.
const CAUSE_GENERATION_UNAVAILABLE = "lot number generation is not available"

/** Every phrase that identifies a message as a lot failure. */
const ALL_CAUSES = [
  CAUSE_ITEM_SHADE,
  CAUSE_STD_WEIGHT,
  CAUSE_NO_PRODUCT,
  CAUSE_LOT_NOT_REGISTERED,
  CAUSE_GENERATION_UNAVAILABLE,
] as const

/**
 * isLotFailure reports whether a message is one this component should render.
 *
 * It requires a known cause phrase rather than merely containing "lot": an
 * unrelated error that happens to mention a lot number must not be dressed up as
 * a fixable master-data problem.
 */
export function isLotFailure(message: string | undefined): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  return ALL_CAUSES.some((cause) => m.includes(cause))
}

/**
 * classifyLotError picks the fixing page for a backend error message.
 *
 * Returns null when the message is not a lot failure, and — deliberately — also
 * when the failure is an unlinked plan item: that is wrong in the plan, not in
 * any master, so there is no single page to send the planner to. Offering a link
 * there was the original bug; offering none is the correct answer.
 */
export function classifyLotError(message: string | undefined): FixRoute | null {
  if (!message) return null
  const m = message.toLowerCase()

  // Ordered most-specific-first as defence in depth. Correctness does not depend
  // on the order — the phrases are mutually exclusive by contract — but if that
  // contract ever regressed, this ordering fails safe (no link) rather than
  // confidently sending an unlinked-plan-item failure to Lot Master.
  if (m.includes(CAUSE_NO_PRODUCT)) return null
  if (m.includes(CAUSE_STD_WEIGHT)) return PRODUCT_MACHINE_PARAMETERS
  if (m.includes(CAUSE_ITEM_SHADE)) return PRODUCT_MASTER
  if (m.includes(CAUSE_LOT_NOT_REGISTERED)) return LOT_MASTER
  if (m.includes(CAUSE_GENERATION_UNAVAILABLE)) return LOT_MASTER
  return null
}

interface LotErrorHintProps {
  /** The message the backend returned, verbatim. */
  message?: string
}

/**
 * LotErrorHint renders nothing unless the last failure was a lot problem.
 */
export function LotErrorHint({ message }: LotErrorHintProps) {
  if (!isLotFailure(message)) return null

  const route = classifyLotError(message)

  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>This work order needs one more thing before it can be created</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <span>{message}</span>
        {route && (
          <Link
            href={route.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-4"
          >
            {route.label}
          </Link>
        )}
      </AlertDescription>
    </Alert>
  )
}
