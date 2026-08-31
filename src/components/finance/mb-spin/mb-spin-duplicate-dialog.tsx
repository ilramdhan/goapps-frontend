"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { MBSpin } from "@/types/finance/mb-spin"
import type { NormalizedMBSpinDuplicateImpact } from "@/types/finance/mb-spin"
import { useDuplicateMBSpin } from "@/hooks/finance/use-mb-spin"
import { useCalculateDozing } from "@/hooks/finance/use-mb-dozing"
import type { NormalizedDozingCalculation } from "@/types/finance/mb-dozing"

// ⭐ DIPERBARUI 2026-08-31 (P4-T5, D6) — duplicating an MB Spin now lets the user
// override Name/Denier/Filament before saving, instead of blindly cloning. Only
// these 3 fields are collected here (intentionally small form) — everything else
// on the clone (status, oracle sys id, orion item code, mb costing, ...) is still
// derived/blanked by the backend per decision D19, unchanged from before.
const formSchema = z.object({
  mbsMgtName: z.string().min(1, "Name is required").max(100),
  mbsDenier: z.coerce.number().positive("Denier must be greater than zero"),
  mbsFilament: z.coerce.number().int().positive("Filament must be greater than zero"),
})

type FormValues = z.infer<typeof formSchema>

interface MBSpinDuplicateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mbSpin: MBSpin | null
  onSuccess?: () => void
}

// Confirms RPC DuplicateMBSpin (P8): clones mbSpin into a fresh "R and D" draft
// child, mbs_orion_item_code always NULL on the clone. Name/Denier/Filament are
// editable overrides sent verbatim in the request (all three OPTIONAL on
// DuplicateMBSpinRequest — see mb-spin-api.ts). A separate "RND/Calculated/
// Actual" duplicate mechanism is undecided and out of scope for this button.
export function MBSpinDuplicateDialog({ open, onOpenChange, mbSpin, onSuccess }: MBSpinDuplicateDialogProps) {
  const duplicateMutation = useDuplicateMBSpin()

  // ⭐ DIPERBARUI 2026-08-31 (P7-T6) — the duplicate RPC also returns a
  // recalc-impact PREVIEW (which children were skipped, which products would
  // be affected). Holding it here lets the dialog show a brief summary
  // instead of closing immediately and discarding it.
  const [impactSummary, setImpactSummary] = useState<NormalizedMBSpinDuplicateImpact | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: { mbsMgtName: "", mbsDenier: 0, mbsFilament: 0 },
  })

  // ⭐ DIPERBARUI 2026-08-31 (P7-T3) — live LDR preview while the user edits
  // Denier/Filament in the duplicate form. READ-ONLY (K-18 pattern, same as
  // mb-dozing-calculator-dialog.tsx): calls the existing CalculateDozing RPC
  // (mode=SCALE) with the SOURCE spin as reference and the edited values as
  // target — never writes into the form, never computes LDR math locally.
  // This dialog only edits Denier/Filament (no cross-section field), so the
  // XSECTION mode does not apply here — SCALE is the only mode in play.
  const calculatePreview = useCalculateDozing()
  const [ldrPreview, setLdrPreview] = useState<NormalizedDozingCalculation | null>(null)
  const watchedDenier = form.watch("mbsDenier")
  const watchedFilament = form.watch("mbsFilament")

  const sourceLdr = mbSpin?.mbsLdrCalculatedPct ?? mbSpin?.mbsRunLdrPct ?? mbSpin?.mbsLdrPrsn
  const sourceDenier = mbSpin?.mbsDenier
  const sourceFilament = mbSpin?.mbsFilament

  const paramsDiffer =
    !!mbSpin &&
    Number.isFinite(Number(watchedDenier)) &&
    Number.isFinite(Number(watchedFilament)) &&
    (Number(watchedDenier) !== Number(sourceDenier) || Number(watchedFilament) !== Number(sourceFilament))

  // Debounced live preview: only fires when denier/filament diverge from the
  // source AND the source actually carries a known LDR to scale from.
  useEffect(() => {
    setLdrPreview(null)
    if (
      !open ||
      impactSummary || // impact summary showing ⇒ form is gone, no preview needed
      !paramsDiffer ||
      sourceLdr === undefined ||
      sourceLdr === null ||
      !sourceDenier ||
      !sourceFilament ||
      !(Number(watchedDenier) > 0) ||
      !(Number(watchedFilament) > 0)
    ) {
      return
    }

    const timer = setTimeout(() => {
      calculatePreview.mutate(
        {
          mode: "SCALE",
          ldrRef: sourceLdr,
          denierRef: sourceDenier,
          filamentRef: sourceFilament,
          denierTarget: Number(watchedDenier),
          filamentTarget: Number(watchedFilament),
        },
        { onSuccess: (out) => setLdrPreview(out) }
      )
    }, 400)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- calculatePreview.mutate is stable (react-query); including the mutation object would re-trigger on every render
  }, [open, impactSummary, paramsDiffer, sourceLdr, sourceDenier, sourceFilament, watchedDenier, watchedFilament])

  const previewHasNumber =
    ldrPreview !== null && ldrPreview.factorAvailable && ldrPreview.resultLdr !== undefined
  const previewNoFactor = ldrPreview !== null && !ldrPreview.factorAvailable

  // Prefill on every open: name is a SUFFIX ("<source name> (copy)"), not a
  // prefix — matches the backend's own derivation for the no-override case
  // (see DuplicateMBSpinRequest.mbsMgtName doc). Denier/Filament prefill from
  // the source spin's current values so the user edits from a real starting
  // point rather than blank/zero.
  useEffect(() => {
    if (open && mbSpin) {
      form.reset({
        mbsMgtName: `${mbSpin.mbsMgtName} (copy)`,
        mbsDenier: mbSpin.mbsDenier ?? 0,
        mbsFilament: mbSpin.mbsFilament ?? 0,
      })
      setImpactSummary(null)
    }
  }, [open, mbSpin, form])

  async function onSubmit(values: FormValues) {
    if (!mbSpin) return
    try {
      const result = await duplicateMutation.mutateAsync({
        mbhId: mbSpin.mbsMbhId,
        mbsId: mbSpin.mbsId,
        mbsMgtName: values.mbsMgtName,
        mbsDenier: values.mbsDenier,
        mbsFilament: values.mbsFilament,
      })
      onSuccess?.()

      // The common case (nothing skipped, nothing affected) closes right away
      // — no need to clutter the success state. Only stick around when there's
      // actually something to tell the user.
      const impact = result?.impact
      const hasSummary = !!impact && (impact.skippedCount > 0 || impact.impactTotalAffected > 0)
      if (hasSummary) {
        setImpactSummary(impact)
      } else {
        onOpenChange(false)
      }
    } catch {
      // toast handled in hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Duplicate MB Spin</DialogTitle>
          <DialogDescription>
            Create a new &quot;R and D&quot; draft cloned from &quot;{mbSpin?.mbsMgtName}&quot;. You can adjust
            the name, denier, and filament before saving — the rest is copied and can be edited afterwards.
          </DialogDescription>
        </DialogHeader>

        {!impactSummary && (
          <Form {...form}>
            <form id="mb-spin-duplicate-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="mbsMgtName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mbsDenier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Denier</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mbsFilament"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Filament</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ⭐ DITAMBAHKAN 2026-08-31 (P7-T3) — live, read-only LDR preview.
                  Shown only once Denier/Filament diverge from the source spin's
                  values; never written into the form, never saved. Mirrors the
                  "Preview" labeling and no-factor handling used in
                  mb-dozing-calculator-dialog.tsx (D13). */}
              {paramsDiffer && sourceLdr !== undefined && sourceLdr !== null && !!sourceDenier && !!sourceFilament && (
                <div className="space-y-1 rounded-md border p-3" data-testid="duplicate-ldr-preview">
                  <div className="flex items-baseline justify-between">
                    <span className="text-muted-foreground text-xs">Preview LDR (%)</span>
                    {calculatePreview.isPending && (
                      <Loader2 className="text-muted-foreground h-3.5 w-3.5 animate-spin" />
                    )}
                  </div>
                  {previewHasNumber && (
                    <p className="text-sm font-semibold" data-testid="duplicate-ldr-preview-value">
                      {ldrPreview!.resultLdr}%
                    </p>
                  )}
                  {previewNoFactor && (
                    <p className="text-muted-foreground text-xs">
                      {ldrPreview!.message ||
                        "No conversion factor exists for this combination, so no preview can be shown."}
                    </p>
                  )}
                  {!previewHasNumber && !previewNoFactor && !calculatePreview.isPending && (
                    <p className="text-muted-foreground text-xs">Calculating…</p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    Preview only, based on the source spin&apos;s LDR — not the value that will be saved.
                  </p>
                </div>
              )}
            </form>
          </Form>
        )}

        {/* Cascade/impact summary (P7-T6) — only shown when the duplicate
            actually skipped a child or would affect a product; the common
            "nothing to report" case never renders this. */}
        {impactSummary && (
          <div className="space-y-3" data-testid="duplicate-impact-summary">
            <Alert>
              <AlertTitle>MB Spin duplicated</AlertTitle>
              <AlertDescription>
                &quot;{mbSpin?.mbsMgtName}&quot; was cloned. Preview only — nothing below was recalculated.
              </AlertDescription>
            </Alert>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {impactSummary.impactTotalAffected > 0 && (
                <Badge variant="secondary">{impactSummary.impactTotalAffected} product(s) affected</Badge>
              )}
              {impactSummary.impactTotalLocked > 0 && (
                <Badge variant="secondary">{impactSummary.impactTotalLocked} locked</Badge>
              )}
              {impactSummary.skippedCount > 0 && (
                <Badge variant="outline">{impactSummary.skippedCount} child spin(s) skipped</Badge>
              )}
              {impactSummary.impactTruncated && <Badge variant="outline">List truncated</Badge>}
            </div>

            {impactSummary.skipped.length > 0 && (
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">
                  Skipped because they&apos;re not editable (e.g. locked as Actual):
                </p>
                <ul className="list-disc space-y-0.5 pl-5 text-sm">
                  {impactSummary.skipped.map((row) => (
                    <li key={row.mbsId}>
                      {row.mbsMgtName} <span className="text-muted-foreground text-xs">({row.reason})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {impactSummary ? (
            <Button
              onClick={() => {
                onOpenChange(false)
              }}
            >
              Done
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={duplicateMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" form="mb-spin-duplicate-form" disabled={duplicateMutation.isPending}>
                {duplicateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Duplicate
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
