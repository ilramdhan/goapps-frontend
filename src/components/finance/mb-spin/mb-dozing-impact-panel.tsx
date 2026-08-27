"use client"

/**
 * MB Dozing impact panel — spin path. Shows which products would be affected by
 * a dozing change on this MB spin row. READ-ONLY (K-18): it previews, it never
 * writes, and it offers no apply action.
 *
 * It lives under mb-spin/ (not mb-recipe/) because the trigger is the
 * mbs_dozing / mbs_denier / mbs_filament group in the SPIN form.
 */

import { useEffect } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { usePreviewDozingImpact } from "@/hooks/finance/use-mb-dozing"

interface MBDozingImpactPanelProps {
  /** MB spin UUID. The panel stays idle while this is empty. */
  mbsId: string
  /** 0 / omitted means the server default (20). */
  limit?: number
  /** Fetch as soon as the panel mounts. */
  autoLoad?: boolean
}

export function MBDozingImpactPanel({ mbsId, limit, autoLoad = true }: MBDozingImpactPanelProps) {
  const preview = usePreviewDozingImpact()
  const { mutate, data, isPending, isError, error } = preview

  useEffect(() => {
    if (autoLoad && mbsId) {
      mutate({ mbsId, limit })
    }
  }, [autoLoad, mbsId, limit, mutate])

  if (!mbsId) return null

  return (
    <div className="space-y-3" data-testid="dozing-impact-panel">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Affected Products</h4>
          <p className="text-muted-foreground text-xs">
            Preview only — changing dozing here does not update these products.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => mutate({ mbsId, limit })}
        >
          {isPending ? "Loading…" : "Refresh"}
        </Button>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Preview failed</AlertTitle>
          <AlertDescription>
            {(error as Error)?.message || "Failed to preview dozing impact"}
          </AlertDescription>
        </Alert>
      )}

      {data && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary">{data.totalAffected} affected</Badge>
            <Badge variant="secondary">{data.totalLocked} locked</Badge>
            {data.truncated && <Badge variant="outline">Showing first {data.rows.length}</Badge>}
          </div>

          {data.note && (
            <Alert>
              <AlertTitle>Note</AlertTitle>
              <AlertDescription>{data.note}</AlertDescription>
            </Alert>
          )}

          {data.rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">No affected products.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Frozen Dozing</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row) => (
                    <TableRow key={row.cpmProductSysId}>
                      <TableCell className="font-mono text-xs">{row.cpmProductCode}</TableCell>
                      <TableCell className="text-sm">{row.cpmProductName}</TableCell>
                      <TableCell className="text-right text-sm">
                        {/* Absent frozen dozing shows as a dash — never as 0. */}
                        {row.frozenDozing === undefined ? "—" : row.frozenDozing}
                      </TableCell>
                      <TableCell>
                        {row.cpmIsLocked ? (
                          <Badge variant="destructive">Locked</Badge>
                        ) : (
                          <Badge variant="secondary">Open</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
