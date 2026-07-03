"use client"

// RequestDetailPanel — renders full request info + state-machine action buttons gated by status.
import { useState } from "react"
import {
  ArrowRight,
  Ban,
  CheckCircle2,
  FileCheck,
  History,
  Inbox,
  Pencil,
  Play,
  RotateCcw,
  XCircle,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useRequestHistory } from "@/hooks/finance/use-cost-product-request"
import { FillTrackingCompact } from "@/components/finance/fill-assignment"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CalculateButton } from "@/components/finance/calc-jobs/calculate-button"
import { UserName } from "@/components/common/user-name"
import { PaperTubeName } from "@/components/common/paper-tube-name"
import {
  AttachmentsPanel,
  CommentsPanel,
} from "@/components/finance/cost-request-comment"
import { RoutingPanel } from "./routing-panel"
import { StatusBadge } from "./status-badge"
import { ParamSummaryPanel } from "./param-summary-panel"
import {
  ClassificationAndFeasibilityDialog,
  CloseDialog,
  ConfirmActionDialog,
  ReasonDialog,
} from "./transition-dialogs"
import {
  useApproveRequest,
  useCancelRequest,
  useConfirmRequest,
  useMarkParameterComplete,
  useMarkParameterPending,
  useReleaseRequest,
  useReviseRequest,
  useReopenRequest,
  useRejectRequest,
  useStartReview,
  useSubmitRequest,
  useCloseRequest,
} from "@/hooks/finance/use-cost-product-request"
import type { CostProductRequest } from "@/types/finance/cost-product-request"
import { usePermissionContext } from "@/providers/permission-provider"
import { useAuth } from "@/providers/auth-provider"
import { useCPRRealtimeSync } from "@/hooks/finance/use-cpr-realtime-sync"
import { useRouteGraph } from "@/hooks/finance/use-cost-route"
import { useParamSummary } from "@/hooks/finance/use-param-summary"

interface Props {
  request: CostProductRequest
  onEdit: () => void
  /** When true, all fill levels are approved and "Mark parameters complete" is enabled. */
  allFillsApproved?: boolean
  /** When true, Fill Progress (sidebar) and Fill Tracking (main content) are shown. */
  hasFillTracking?: boolean
}

type DialogKind = "reject" | "cancel" | "reviewDecide" | "close" | "confirmAction" | null

export function RequestDetailPanel({ request, onEdit, allFillsApproved = false, hasFillTracking = false }: Props) {
  useCPRRealtimeSync(request.requestId)

  const [dialog, setDialog] = useState<DialogKind>(null)
  const [confirmActionType, setConfirmActionType] = useState<"confirm" | "approve" | "release">("confirm")

  const submitM = useSubmitRequest()
  const startM = useStartReview()
  const reviseM = useReviseRequest()
  const reopenM = useReopenRequest()
  const rejectM = useRejectRequest()
  const cancelM = useCancelRequest()
  const closeM = useCloseRequest()
  const markPendingM = useMarkParameterPending()
  const markCompleteM = useMarkParameterComplete()
  const confirmM = useConfirmRequest()
  const approveM = useApproveRequest()
  const releaseM = useReleaseRequest()

  const { hasPermission } = usePermissionContext()
  const { user } = useAuth()
  const currentUserId = user?.userId

  const isOwner = request.requesterUserId === currentUserId

  const canCreate      = hasPermission("finance.product.request.create")
  const canSubmit      = hasPermission("finance.product.request.submit")
  const canReview      = hasPermission("finance.product.request.review")
  const canResolve     = hasPermission("finance.product.request.resolve")
  const canReject      = hasPermission("finance.product.request.reject")
  const canRouteCreate = hasPermission("finance.product.route.create")
  const canRouteUpdate = hasPermission("finance.product.route.update")
  const canCalc        = hasPermission("finance.cost.caljob.trigger")
  const canReopen      = hasPermission("finance.product.request.reopen")
  const canConfirm     = hasPermission("finance.product.request.confirm")
  const canApprove     = hasPermission("finance.product.request.approve")
  const canRelease     = hasPermission("finance.product.request.release")
  const canManageLock  = hasPermission("finance.costing.route.unlock")

  const { data: routeGraph } = useRouteGraph(request.linkedRouteHeadId)
  const routeHead = routeGraph?.head
  const isRouteLocked = routeHead?.routingStatus === "LOCKED"

  const { data: paramSummary } = useParamSummary(request.requestId)

  const requestId = request.requestId
  const status = request.status

  const isDraft = status === "DRAFT"
  const isSubmitted = status === "SUBMITTED"
  const isUnderReview = status === "UNDER_REVIEW"
  const isQuoteReady = status === "QUOTE_READY"
  const isRoutingDefined = status === "ROUTING_DEFINED"
  const isParameterPending = status === "PARAMETER_PENDING"
  const isParameterComplete = status === "PARAMETER_COMPLETE"
  const isConfirmed = status === "CONFIRMED"
  const isApproved = status === "APPROVED"
  const isReleased = status === "RELEASED"
  const isRejected = status === "REJECTED"
  const isClosed = status === "CLOSED"
  // Terminal = the request lifecycle has stopped. Both REJECTED and CLOSED are
  // read-only: the only thing allowed is to reopen/revise. Everything else
  // (forward transitions, comments, uploads, route changes) is disabled.
  const isTerminal = isRejected || isClosed
  const readOnly = isTerminal

  return (
    <div className="space-y-6">
      {/* Read-only notice when the request has stopped. */}
      {isTerminal && (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Ban className="h-4 w-4 shrink-0" />
          <span>
            This request is <strong>{isRejected ? "rejected" : "closed"}</strong> and read-only.
            {isRejected
              ? " You can revise & resubmit to continue."
              : " Reopen it to make further changes."}
          </span>
        </div>
      )}

      {/* Action toolbar — gated by status AND permissions. Terminal states show only reopen/revise. */}
      <div className="flex flex-wrap items-center gap-2">
        {isRejected && canCreate && isOwner && (
          <Button onClick={() => reviseM.mutate({ requestId })} disabled={reviseM.isPending}>
            <RotateCcw className="mr-2 h-4 w-4" /> Revise &amp; resubmit
          </Button>
        )}
        {isClosed && canReopen && (
          <Button onClick={() => reopenM.mutate({ requestId })} disabled={reopenM.isPending}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reopen request
          </Button>
        )}
        {isDraft && canCreate && isOwner && (
          <Button onClick={onEdit} variant="outline">
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
        )}
        {isDraft && canSubmit && (
          <Button onClick={() => submitM.mutate({ requestId })} disabled={submitM.isPending}>
            <Play className="mr-2 h-4 w-4" /> Submit
          </Button>
        )}
        {isSubmitted && canReview && (
          <Button onClick={() => startM.mutate({ requestId })} disabled={startM.isPending}>
            <Inbox className="mr-2 h-4 w-4" /> Start review
          </Button>
        )}
        {isRoutingDefined && canRouteUpdate && (
          <Button
            onClick={() => markPendingM.mutate({ requestId })}
            disabled={markPendingM.isPending}
          >
            <Play className="mr-2 h-4 w-4" /> Promote route
          </Button>
        )}
        {isUnderReview && canResolve && (
          <Button onClick={() => setDialog("reviewDecide")}>
            <FileCheck className="mr-2 h-4 w-4" /> Review &amp; decide
          </Button>
        )}
        {(isSubmitted || isUnderReview) && canReject && (
          <Button variant="destructive" onClick={() => setDialog("reject")}>
            <XCircle className="mr-2 h-4 w-4" /> Reject
          </Button>
        )}
        {isParameterPending && canResolve && (
          <Button
            onClick={() => markCompleteM.mutate({ requestId })}
            disabled={markCompleteM.isPending || !allFillsApproved}
            title={!allFillsApproved ? "All fill levels must be approved before marking complete" : undefined}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" /> Mark parameters complete
          </Button>
        )}
        {isParameterComplete && canConfirm && (
          <Button
            onClick={() => { setConfirmActionType("confirm"); setDialog("confirmAction") }}
            disabled={confirmM.isPending}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" /> Confirm
          </Button>
        )}
        {isConfirmed && canApprove && (
          <Button
            onClick={() => { setConfirmActionType("approve"); setDialog("confirmAction") }}
            disabled={approveM.isPending}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
          </Button>
        )}
        {isApproved && canRelease && (
          <Button
            onClick={() => { setConfirmActionType("release"); setDialog("confirmAction") }}
            disabled={releaseM.isPending}
          >
            <Play className="mr-2 h-4 w-4" /> Release
          </Button>
        )}
        {!isTerminal &&
          canCalc &&
          !!request.linkedRouteHeadId &&
          (status === "ROUTING_DEFINED" ||
            status === "PARAMETER_PENDING" ||
            status === "PARAMETER_COMPLETE" ||
            status === "CONFIRMED" ||
            status === "APPROVED" ||
            status === "RELEASED" ||
            status === "COSTING_DONE") && (
          <CalculateButton
            routeHeadId={request.linkedRouteHeadId}
            label="Calculate for linked route"
          />
        )}
        {!isTerminal && (isOwner || canSubmit || canResolve) && (
          <>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setDialog("close")}>
              Close
            </Button>
            <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDialog("cancel")}>
              <Ban className="mr-2 h-4 w-4" /> Cancel
            </Button>
          </>
        )}
      </div>

      {/* Bento grid — left column: main content; right column: trace + routing + attachments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Left column ────────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-6">

          {/* Header card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground font-mono">{request.requestNo}</div>
                  <CardTitle>{request.title}</CardTitle>
                </div>
                <StatusBadge status={status} substatus={request.closedSubstatus} size="lg" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <Field label="Type">{request.requestTypeCode ?? `#${request.requestTypeId}`}</Field>
                <Field label="Urgency">{humanizeEnumValue(request.urgencyLevel)}</Field>
                <Field label="Classification">
                  <span className="capitalize">{request.productClassification}</span>
                  {request.verifiedClassification && request.verifiedClassification !== request.productClassification && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 text-muted-foreground">
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      <span className="capitalize">{request.verifiedClassification}</span>
                    </span>
                  )}
                </Field>
                <Field label="Needed by">{request.neededByDate || "—"}</Field>
                <Field label="Customer">{request.customerName}</Field>
                <Field label="Customer code">{request.customerCode || "—"}</Field>
                <Field label="Target volume">{request.targetVolume || "—"}</Field>
                <Field label="Target price">{request.targetPriceRange || "—"}</Field>
                <Field label="Requester"><UserName userId={request.requesterUserId} /></Field>
              </div>
              {request.description && (
                <div className="border-t pt-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Description</div>
                  <p className="text-sm whitespace-pre-wrap">{request.description}</p>
                </div>
              )}
              <div className="border-t pt-4 space-y-2">
                <AttachmentsPanel requestId={request.requestId} readOnly={readOnly} inline />
              </div>
            </CardContent>
          </Card>

          {request.spec && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Product specification</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <Field label="Raw material">{request.spec.rawMaterialType}</Field>
                <Field label="Paper tube"><PaperTubeName id={request.spec.paperTubeTypeId} /></Field>
                <Field label="Weight / bobbin">{request.spec.weightPerBobbinKg} kg</Field>
                <Field label="Box type">{request.spec.boxType}</Field>
                <Field label="Shade">{request.spec.shadeCustomText || `master #${request.spec.shadeId ?? "—"}`}</Field>
                <div className="col-span-2 md:col-span-4">
                  <Separator className="my-2" />
                  <Field label="Product description">
                    <p className="whitespace-pre-wrap">{request.spec.productDescription}</p>
                  </Field>
                </div>
              </CardContent>
            </Card>
          )}

          {(request.classificationOverrideReason || request.feasibilityDecision) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Review assessment</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {/* Flat 4-cell grid — each row spans both columns so alignment is always correct */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 items-start">
                  {/* Row 1: Classification | Feasibility */}
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Classification</div>
                    <div>
                      <span className="capitalize">{request.productClassification}</span>
                      {request.verifiedClassification && request.verifiedClassification !== request.productClassification ? (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 text-muted-foreground">
                          <ArrowRight className="h-3 w-3 shrink-0" />
                          <span className="capitalize">{request.verifiedClassification}</span>
                        </span>
                      ) : !request.verifiedClassification ? (
                        <span className="ml-1 text-muted-foreground text-xs">— not verified</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Feasibility</div>
                    {request.feasibilityDecision ? (
                      <div>
                        <span className="font-medium">{humanizeEnumValue(request.feasibilityDecision)}</span>
                        {request.feasibilityBy && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <UserName userId={request.feasibilityBy} compact />
                            {request.feasibilityAt && (
                              <> · {new Date(request.feasibilityAt).toLocaleString("en-GB", {
                                year: "numeric", month: "short", day: "2-digit",
                                hour: "2-digit", minute: "2-digit",
                              })}</>
                            )}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>

                  {/* Row 2: Override reason | Note — empty placeholder keeps columns aligned */}
                  {(request.classificationOverrideReason || request.feasibilityNote) && (
                    <>
                      <div className="space-y-1">
                        {request.classificationOverrideReason && (
                          <>
                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Override reason</div>
                            <p className="whitespace-pre-wrap text-muted-foreground">{request.classificationOverrideReason}</p>
                          </>
                        )}
                      </div>
                      <div className="space-y-1">
                        {request.feasibilityNote && (
                          <>
                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Note</div>
                            <p className="whitespace-pre-wrap text-muted-foreground">{request.feasibilityNote}</p>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {request.rejectReason && (
            <Card className="border-destructive/40">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold">Reject reason</CardTitle>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{request.rejectReason}</p>
              </CardContent>
            </Card>
          )}

          {request.cancelReason && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Cancel reason</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{request.cancelReason}</p>
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <CommentsPanel requestId={request.requestId} readOnly={readOnly} />
        </div>

        {/* ── Right column ───────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-6">

          {/* Approval trace timeline */}
          <ApprovalTraceTimeline requestId={request.requestId} />

          {/* Fill tracking compact list — self-hides when no tasks */}
          {hasFillTracking && (
            <FillTrackingCompact requestId={request.requestId} />
          )}

          {/* Parameter summary — fill progress per product/level */}
          {hasFillTracking && (
            <ParamSummaryPanel requestId={request.requestId} routeLocked={isRouteLocked} />
          )}

          {/* Routing panel — only show from ROUTING_DEFINED onwards. QUOTE_READY = existing costing path (no routing).
              Lock/unlock/complete actions are folded into this card when canManageLock is true. */}
          {!isDraft && !isSubmitted && !isUnderReview && !isQuoteReady && (
            <RoutingPanel
              requestId={request.requestId}
              linkedRouteHeadId={request.linkedRouteHeadId}
              readOnly={readOnly || !(canRouteCreate || canRouteUpdate)}
              canUnlink={!isConfirmed && !isApproved && !isReleased && !isTerminal}
              canManageLock={canManageLock}
              showCompleteAction={
                !isTerminal &&
                (isParameterPending || isParameterComplete || isConfirmed || isApproved || isReleased)
              }
            />
          )}

        </div>
      </div>

      {/* Dialogs */}
      <ReasonDialog
        open={dialog === "reject"}
        onOpenChange={(o) => setDialog(o ? "reject" : null)}
        title="Reject request"
        description="Provide a reason — the requester can revise and re-submit."
        confirmLabel="Reject"
        pending={rejectM.isPending}
        onConfirm={(reason) => {
          rejectM.mutate({ requestId, body: { reason } }, { onSuccess: () => setDialog(null) })
        }}
      />
      <ReasonDialog
        open={dialog === "cancel"}
        onOpenChange={(o) => setDialog(o ? "cancel" : null)}
        title="Cancel request"
        description="Cancelling closes the request with sub-status = cancelled. Provide a reason."
        confirmLabel="Cancel request"
        pending={cancelM.isPending}
        onConfirm={(reason) => {
          cancelM.mutate({ requestId, body: { reason } }, { onSuccess: () => setDialog(null) })
        }}
      />
      <ClassificationAndFeasibilityDialog
        open={dialog === "reviewDecide"}
        onOpenChange={(o) => setDialog(o ? "reviewDecide" : null)}
        requestId={requestId}
        currentClassification={request.productClassification}
        initialVerifiedClassification={request.verifiedClassification}
      />
      <CloseDialog
        open={dialog === "close"}
        onOpenChange={(o) => setDialog(o ? "close" : null)}
        pending={closeM.isPending}
        onConfirm={(substatus) => {
          closeM.mutate({ requestId, closedSubstatus: substatus }, { onSuccess: () => setDialog(null) })
        }}
      />
      <ConfirmActionDialog
        open={dialog === "confirmAction"}
        onOpenChange={(v) => {
          if (!v) setDialog(null)
        }}
        action={confirmActionType}
        pending={confirmM.isPending || approveM.isPending || releaseM.isPending}
        totalParams={paramSummary?.totalParams ?? 0}
        filledParams={paramSummary?.filledParams ?? 0}
        isLocked={isRouteLocked}
        onConfirm={() => {
          if (confirmActionType === "confirm") {
            confirmM.mutate({ requestId }, { onSuccess: () => setDialog(null) })
          } else if (confirmActionType === "approve") {
            approveM.mutate({ requestId }, { onSuccess: () => setDialog(null) })
          } else if (confirmActionType === "release") {
            releaseM.mutate({ requestId }, { onSuccess: () => setDialog(null) })
          }
        }}
      />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  )
}

function humanizeEnumValue(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function ApprovalTraceTimeline({ requestId }: { requestId: number }) {
  const { data: entries = [], isLoading } = useRequestHistory(requestId)

  if (!isLoading && entries.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Approval trace</CardTitle>
          </div>
          {!isLoading && (
            <span className="text-xs text-muted-foreground">{entries.length} events</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ol className="space-y-0">
            {entries.map((entry, i) => {
              const isSelf = entry.fromStatus && entry.fromStatus === entry.toStatus
              const label = isSelf
                ? humanizeEnumValue(entry.toStatus)
                : entry.fromStatus
                  ? `${humanizeEnumValue(entry.fromStatus)} → ${humanizeEnumValue(entry.toStatus)}`
                  : humanizeEnumValue(entry.toStatus)
              const actor = entry.actorName || entry.actorUserId

              return (
                <li key={entry.id} className="flex gap-3 min-w-0">
                  {/* Timeline connector */}
                  <div className="flex shrink-0 flex-col items-center">
                    <div className="mt-[0.4rem] h-2 w-2 rounded-full bg-muted-foreground/50 ring-2 ring-background" />
                    {i < entries.length - 1 && (
                      <div className="mt-1 w-px flex-1 bg-border" />
                    )}
                  </div>
                  {/* Content */}
                  <div className={`min-w-0 flex-1 ${i < entries.length - 1 ? "pb-4" : "pb-0"}`}>
                    <p className={`text-sm leading-snug ${isSelf ? "text-muted-foreground" : ""}`}>
                      {label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {actor}
                      {entry.createdAt && (
                        <> · {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}</>
                      )}
                    </p>
                    {entry.note && (
                      <p className="mt-1 text-xs italic text-muted-foreground/70 whitespace-pre-wrap">
                        {entry.note}
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
