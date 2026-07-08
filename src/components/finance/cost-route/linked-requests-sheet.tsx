"use client"

import { useState } from "react"
import Link from "next/link"
import { Link2, X } from "lucide-react"

import { StatusBadge } from "@/components/common/status-badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import { useLinkedRequests } from "@/hooks/finance/use-duplicate-route"

interface Props {
  headId: number
}

export function LinkedRequestsSheet({ headId }: Props) {
  const [open, setOpen] = useState(false)
  const { data } = useLinkedRequests(headId)
  const rows = data ?? []

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Link2 className="mr-1.5 h-4 w-4" />
        {rows.length} linked {rows.length === 1 ? "request" : "requests"}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="flex flex-col p-0 w-full sm:max-w-md gap-0"
        >
          {/* Sticky header */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-background px-6 py-4">
            <div className="space-y-0.5">
              <SheetTitle className="text-base font-semibold">Linked requests</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                {rows.length === 0
                  ? "No product requests linked to this route."
                  : `${rows.length} product ${rows.length === 1 ? "request" : "requests"} linked to this route.`}
              </SheetDescription>
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </SheetClose>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No requests linked yet.
              </p>
            ) : (
              <ul className="divide-y">
                {rows.map((r) => (
                  <li key={r.requestId} className="py-3">
                    <Link
                      href={`/finance/product-requests/${r.requestId}`}
                      className="group -mx-2 block space-y-1 rounded-md p-2 transition-colors hover:bg-muted/50"
                      onClick={() => setOpen(false)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-medium group-hover:text-primary">
                          {r.requestNo}
                        </span>
                        <StatusBadge status={r.status} type="request" size="sm" />
                      </div>
                      {r.productTop2 && (
                        <div className="truncate text-xs text-muted-foreground">
                          {r.productTop2}
                        </div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
