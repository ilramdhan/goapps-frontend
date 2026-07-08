"use client"

import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { useParamEditLog } from "@/hooks/finance/use-param-summary"

interface Props {
  open: boolean
  onClose: () => void
  requestId: number
  routeLevel: number
  productCode: string
}

function formatDateTime(iso: string): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("id-ID", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

export function ParamEditLogDrawer({ open, onClose, requestId, routeLevel, productCode }: Props) {
  const { data: entries, isLoading } = useParamEditLog(requestId, routeLevel)

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex flex-col gap-0 p-0 w-full sm:max-w-lg"
      >
        {/* Sticky header */}
        <div className="flex shrink-0 items-start gap-3 border-b bg-background px-6 py-4">
          <div className="flex-1 min-w-0 space-y-1">
            <SheetTitle className="text-base font-semibold leading-tight">
              Edit History — Level {routeLevel}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              {productCode} · param value overrides ordered newest-first
            </SheetDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={onClose}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-md" />
              ))}
            </div>
          )}

          {!isLoading && (!entries || entries.length === 0) && (
            <p className="text-sm text-muted-foreground">No override history found for this level.</p>
          )}

          {!isLoading && entries && entries.length > 0 && (
            <div className="space-y-3">
              {entries.map((entry, idx) => (
                <div
                  key={idx}
                  className="rounded-md border bg-muted/20 p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-semibold text-[11px]">{entry.paramCode}</span>
                    <span className="text-muted-foreground">{formatDateTime(entry.changedAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-muted-foreground line-through">
                      {entry.oldValue || "——"}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium">{entry.newValue || "——"}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    by {entry.changedBy}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
