"use client"

import Link from "next/link"
import { useState } from "react"
import { AlertTriangle, Lock, Loader2, Unlock } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { UserName } from "@/components/common/user-name"
import { DuplicateRouteDialog } from "@/components/finance/cost-route/duplicate-route-dialog"
import { RoutingResolver } from "@/components/finance/cost-product-request/routing-resolver"
import { UnlockPasswordDialog } from "./unlock-password-dialog"
import { useCompleteRoute, useLockRoute, useRouteGraph, useUnlockRoute } from "@/hooks/finance/use-cost-route"
import { useLinkedRequests } from "@/hooks/finance/use-duplicate-route"
import { useUnlinkRoute } from "@/hooks/finance/use-link-route"
import { useParamSummary } from "@/hooks/finance/use-param-summary"

interface Props {
  requestId: number
  linkedRouteHeadId?: number
  /** When true the request is terminal: routing is view-only (no link/create/unlink/duplicate). */
  readOnly?: boolean
  /** When false, Unlink is hidden regardless of other conditions. */
  canUnlink?: boolean
  /** When true, show lock/unlock/complete actions in the card. */
  canManageLock?: boolean
  /** When true, show the "Mark route complete" prompt (route is DRAFT but CPR is past routing). */
  showCompleteAction?: boolean
}

export function RoutingPanel({
  requestId,
  linkedRouteHeadId,
  readOnly = false,
  canUnlink = true,
  canManageLock = false,
  showCompleteAction = false,
}: Props) {
  const [resolverOpen, setResolverOpen] = useState(false)
  const [dupOpen, setDupOpen] = useState(false)
  const [dialogAction, setDialogAction] = useState<"lock" | "unlock" | null>(null)
  const [passwordError, setPasswordError] = useState<string | undefined>()

  const unlinkM = useUnlinkRoute()
  const completeRouteM = useCompleteRoute()
  const lockM = useLockRoute()
  const unlockM = useUnlockRoute()

  const { data: graph, isLoading } = useRouteGraph(linkedRouteHeadId)
  const { data: linked } = useLinkedRequests(linkedRouteHeadId)
  const { data: summary } = useParamSummary(requestId)

  const isPendingLock = lockM.isPending || unlockM.isPending

  function handleLockConfirm(password: string) {
    setPasswordError(undefined)
    const mutate = dialogAction === "lock" ? lockM.mutate : unlockM.mutate
    mutate(
      { headId: graph!.head.headId, password },
      {
        onSuccess: () => setDialogAction(null),
        onError: (err: Error) => {
          const msg = err.message.toLowerCase()
          if (
            msg.includes("password") ||
            msg.includes("invalid") ||
            msg.includes("unauthorized") ||
            msg.includes("unauthenticated")
          ) {
            setPasswordError(err.message)
          } else {
            setDialogAction(null)
          }
        },
      },
    )
  }

  // State C — nothing linked.
  if (!linkedRouteHeadId) {
    return (
      <>
        <Card data-testid="routing-panel">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Routing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {readOnly ? (
              <p className="text-sm text-muted-foreground">
                No routing was defined. The request is read-only.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  No routing defined yet. Attach a product to build the cost basis.
                </p>
                <Button variant="default" onClick={() => setResolverOpen(true)}>
                  Attach product routing
                </Button>
              </>
            )}
          </CardContent>
        </Card>
        <Dialog open={resolverOpen} onOpenChange={setResolverOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Attach product routing</DialogTitle>
            </DialogHeader>
            <RoutingResolver
              requestId={requestId}
              onResolved={() => setResolverOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </>
    )
  }

  if (isLoading || !graph) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 pt-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading route…
        </CardContent>
      </Card>
    )
  }

  const head = graph.head
  const isShared = (linked?.length ?? 0) > 1
  const isLocked = head.routingStatus === "LOCKED"
  const isComplete = head.routingStatus === "COMPLETE"
  const isDraftRoute = head.routingStatus === "DRAFT"

  const unfilledCount = summary !== undefined ? summary.totalParams - summary.filledParams : undefined
  const canLock = isComplete && (unfilledCount === undefined || unfilledCount === 0)

  return (
    <>
      <Card data-testid="routing-panel">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
          <CardTitle className="text-sm font-semibold">Routing</CardTitle>
          <div className="flex items-center gap-1.5">
            {isLocked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
            <Badge variant="outline" className="text-xs font-normal">
              {isShared ? "Shared" : "Own"} · {head.routingStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Route info */}
          <div className="space-y-1 rounded border bg-muted/20 p-3">
            <div className="font-mono text-sm">
              {head.productCode}
              {head.productName ? (
                <span className="text-muted-foreground"> — {head.productName}</span>
              ) : null}
            </div>
            <div className="text-xs text-muted-foreground">
              Route #{head.headId} · v{head.version} · {graph.seqs.length} stages
            </div>
            {isShared && (
              <div className="text-xs">Shared by {linked?.length ?? 0} requests</div>
            )}
          </div>

          {/* Navigation + route management buttons */}
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/finance/routes/${head.headId}?from=request:${requestId}`}>Open route ↗</Link>
            </Button>
            {!readOnly && (
              <Button variant="outline" size="sm" onClick={() => setDupOpen(true)}>
                Duplicate &amp; adjust
              </Button>
            )}
            {!readOnly && canUnlink && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isLocked || unlinkM.isPending}
                        onClick={() => unlinkM.mutate({ requestId })}
                      >
                        Unlink
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {isLocked && (
                    <TooltipContent>Unlock the route before unlinking.</TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {!readOnly && canUnlink && isLocked && (
            <p className="text-xs text-muted-foreground">
              Unlock the route before unlinking.
            </p>
          )}

          {/* Lock management — only visible to route managers */}
          {canManageLock && (
            <div className="border-t pt-3 space-y-2">
              {/* Route is DRAFT but CPR is past routing — prompt to mark complete */}
              {isDraftRoute && showCompleteAction && (
                <div className="flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  <span>Mark route complete before locking.</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-900/50"
                    disabled={completeRouteM.isPending}
                    onClick={() => completeRouteM.mutate({ headId: head.headId })}
                  >
                    Mark complete
                  </Button>
                </div>
              )}

              {/* Route is COMPLETE — show lock button */}
              {isComplete && (
                <>
                  {!canLock && unfilledCount !== undefined && unfilledCount > 0 && (
                    <p className="flex items-center gap-1.5 text-xs text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {unfilledCount} param{unfilledCount > 1 ? "s" : ""} still empty — fill all before locking.
                    </p>
                  )}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="block">
                          <Button
                            size="sm"
                            className="w-full"
                            disabled={isPendingLock || !canLock}
                            onClick={() => { setPasswordError(undefined); setDialogAction("lock") }}
                          >
                            <Lock className="mr-2 h-4 w-4" /> Lock Route
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!canLock && unfilledCount !== undefined && unfilledCount > 0 && (
                        <TooltipContent>Fill all required params before locking.</TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}

              {/* Route is LOCKED — show status + unlock button */}
              {isLocked && (
                <>
                  <div className="space-y-0.5 text-xs text-muted-foreground">
                    {head.lockedBy && (
                      <p>Locked by: <span className="font-medium text-foreground"><UserName userId={head.lockedBy} compact /></span></p>
                    )}
                    {head.lockedAt && (
                      <p>Since: <span className="font-medium text-foreground">{head.lockedAt.slice(0, 16).replace("T", " ")} UTC</span></p>
                    )}
                  </div>
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                    Param values are read-only while locked.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={isPendingLock}
                    onClick={() => { setPasswordError(undefined); setDialogAction("unlock") }}
                  >
                    <Unlock className="mr-2 h-4 w-4" /> Unlock Route
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <DuplicateRouteDialog
        open={dupOpen}
        onClose={() => setDupOpen(false)}
        sourceHeadId={head.headId}
        sourceProductCode={head.productCode}
        linkedRequestId={requestId}
      />

      {/* key changes whenever action type changes — forces remount and clears internal password state */}
      <UnlockPasswordDialog
        key={dialogAction ?? "closed"}
        open={dialogAction !== null}
        onOpenChange={(v) => {
          if (!v) { setDialogAction(null); setPasswordError(undefined) }
        }}
        action={dialogAction ?? "lock"}
        isPending={isPendingLock}
        onConfirm={handleLockConfirm}
        error={passwordError}
      />
    </>
  )
}
