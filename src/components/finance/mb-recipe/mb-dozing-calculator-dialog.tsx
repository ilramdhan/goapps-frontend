"use client"

/**
 * MB Dozing (LDR) calculator dialog — READ-ONLY (decision K-18). It computes and
 * displays; it never saves. There is deliberately no "Apply" mutation.
 *
 * TWO TABS ONLY: Scale and Cross Section. The third mode from the consolidated
 * design is on hold under decision gate G6-C3 and its formula semantics are not
 * settled, so it is absent from the proto and MUST stay absent from this UI.
 * Do not add a third tab.
 *
 * D13 — `factorAvailable === false` is the NORMAL "no conversion factor exists
 * for this pair" outcome, not an error. When it happens the server message is
 * shown and NO number is rendered at all: no result, no trace value, no 1.0
 * fallback. A wrong number is worse than no number.
 */

import { useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { useCalculateDozing } from "@/hooks/finance/use-mb-dozing"
import {
  MB_CROSS_SECTION_KNOWN_CODES,
} from "@/types/finance/mb-cross-section"
import type {
  CalculateDozingPayload,
  MbDozingMode,
  NormalizedDozingCalculation,
} from "@/types/finance/mb-dozing"

interface MBDozingCalculatorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Optional seed for the source LDR, e.g. the current recipe dozing. */
  defaultLdr?: number
}

type ScaleFields = {
  ldrRef: string
  denierRef: string
  filamentRef: string
  denierTarget: string
  filamentTarget: string
}

type XSectionFields = {
  ldrSource: string
  fromCrossSection: string
  toCrossSection: string
}

function numOrNull(v: string): number | null {
  const t = v.trim()
  if (t === "") return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export function MBDozingCalculatorDialog({
  open,
  onOpenChange,
  defaultLdr,
}: MBDozingCalculatorDialogProps) {
  const seedLdr = defaultLdr === undefined ? "" : String(defaultLdr)

  const [mode, setMode] = useState<MbDozingMode>("SCALE")
  const [scale, setScale] = useState<ScaleFields>({
    ldrRef: seedLdr,
    denierRef: "",
    filamentRef: "",
    denierTarget: "",
    filamentTarget: "",
  })
  const [xsection, setXSection] = useState<XSectionFields>({
    ldrSource: seedLdr,
    fromCrossSection: "",
    toCrossSection: "",
  })
  const [result, setResult] = useState<NormalizedDozingCalculation | null>(null)

  const calculate = useCalculateDozing()

  const scaleReady =
    numOrNull(scale.ldrRef) !== null &&
    (numOrNull(scale.denierRef) ?? 0) > 0 &&
    (numOrNull(scale.filamentRef) ?? 0) > 0 &&
    (numOrNull(scale.denierTarget) ?? 0) > 0 &&
    (numOrNull(scale.filamentTarget) ?? 0) > 0

  const xsectionReady =
    numOrNull(xsection.ldrSource) !== null &&
    xsection.fromCrossSection !== "" &&
    xsection.toCrossSection !== ""

  const canCalculate = (mode === "SCALE" ? scaleReady : xsectionReady) && !calculate.isPending

  function handleModeChange(next: string) {
    setMode(next as MbDozingMode)
    // A result belongs to the mode that produced it.
    setResult(null)
    calculate.reset()
  }

  async function handleCalculate() {
    const payload: CalculateDozingPayload =
      mode === "SCALE"
        ? {
            mode: "SCALE",
            ldrRef: numOrNull(scale.ldrRef) as number,
            denierRef: numOrNull(scale.denierRef) as number,
            filamentRef: numOrNull(scale.filamentRef) as number,
            denierTarget: numOrNull(scale.denierTarget) as number,
            filamentTarget: numOrNull(scale.filamentTarget) as number,
          }
        : {
            mode: "XSECTION",
            ldrSource: numOrNull(xsection.ldrSource) as number,
            fromCrossSection: xsection.fromCrossSection,
            toCrossSection: xsection.toCrossSection,
          }

    try {
      const out = await calculate.mutateAsync(payload)
      setResult(out)
    } catch {
      setResult(null)
    }
  }

  // D13: no factor ⇒ withhold every number, show the server's own message.
  const factorMissing = result !== null && !result.factorAvailable
  // `undefined` (no result) and `0` (the result IS zero) are different states.
  const hasNumber = result !== null && result.factorAvailable && result.resultLdr !== undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dozing (LDR) Calculator</DialogTitle>
          <DialogDescription>
            Calculates a target LDR for reference only. Nothing is saved.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={handleModeChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="SCALE">Scale</TabsTrigger>
            <TabsTrigger value="XSECTION">Cross Section</TabsTrigger>
          </TabsList>

          <TabsContent value="SCALE" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="dozing-ldr-ref">Reference LDR (%)</Label>
              <Input
                id="dozing-ldr-ref"
                type="number"
                value={scale.ldrRef}
                onChange={(e) => setScale({ ...scale, ldrRef: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dozing-denier-ref">Reference Denier</Label>
                <Input
                  id="dozing-denier-ref"
                  type="number"
                  value={scale.denierRef}
                  onChange={(e) => setScale({ ...scale, denierRef: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dozing-filament-ref">Reference Filament</Label>
                <Input
                  id="dozing-filament-ref"
                  type="number"
                  value={scale.filamentRef}
                  onChange={(e) => setScale({ ...scale, filamentRef: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dozing-denier-target">Target Denier</Label>
                <Input
                  id="dozing-denier-target"
                  type="number"
                  value={scale.denierTarget}
                  onChange={(e) => setScale({ ...scale, denierTarget: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dozing-filament-target">Target Filament</Label>
                <Input
                  id="dozing-filament-target"
                  type="number"
                  value={scale.filamentTarget}
                  onChange={(e) => setScale({ ...scale, filamentTarget: e.target.value })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="XSECTION" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="dozing-ldr-source">Source LDR (%)</Label>
              <Input
                id="dozing-ldr-source"
                type="number"
                value={xsection.ldrSource}
                onChange={(e) => setXSection({ ...xsection, ldrSource: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dozing-from-xs">From Cross Section</Label>
                <select
                  id="dozing-from-xs"
                  className="border-input bg-background h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs"
                  value={xsection.fromCrossSection}
                  onChange={(e) => setXSection({ ...xsection, fromCrossSection: e.target.value })}
                >
                  <option value="">Select…</option>
                  {MB_CROSS_SECTION_KNOWN_CODES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dozing-to-xs">To Cross Section</Label>
                <select
                  id="dozing-to-xs"
                  className="border-input bg-background h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs"
                  value={xsection.toCrossSection}
                  onChange={(e) => setXSection({ ...xsection, toCrossSection: e.target.value })}
                >
                  <option value="">Select…</option>
                  {MB_CROSS_SECTION_KNOWN_CODES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {calculate.isError && (
          <Alert variant="destructive">
            <AlertTitle>Calculation failed</AlertTitle>
            <AlertDescription>
              {(calculate.error as Error)?.message || "Failed to calculate dozing"}
            </AlertDescription>
          </Alert>
        )}

        {/*
          No conversion factor. Render the server's message and NOTHING numeric —
          no result, no trace, no fallback. (D13)
        */}
        {factorMissing && (
          <Alert data-testid="dozing-no-factor">
            <AlertTitle>No conversion factor</AlertTitle>
            <AlertDescription>
              {result.message ||
                "No conversion factor exists for the selected combination, so no result can be shown."}
            </AlertDescription>
          </Alert>
        )}

        {hasNumber && (
          <div className="space-y-2 rounded-md border p-3" data-testid="dozing-result">
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground text-sm">Result LDR</span>
              <span className="text-lg font-semibold" data-testid="dozing-result-value">
                {result.resultLdr}
              </span>
            </div>
            {result.formulaCode && (
              <p className="text-muted-foreground text-xs">Formula: {result.formulaCode}</p>
            )}
            {result.calculationTrace && (
              <p className="text-muted-foreground font-mono text-xs break-all">
                {result.calculationTrace}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            onClick={handleCalculate}
            disabled={!canCalculate}
            data-testid="dozing-calculate"
          >
            {calculate.isPending ? "Calculating…" : "Calculate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
