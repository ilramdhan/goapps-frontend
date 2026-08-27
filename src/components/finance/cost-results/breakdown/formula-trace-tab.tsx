"use client"

// Extracted verbatim from cost-breakdown-modal.tsx (P11 [G.6]).
// Pure extraction — the props signature is unchanged.

import { ArrowRight } from "lucide-react"

import type { FormulaEval } from "@/types/finance/cost-calc"

import { formatNumeric } from "../format"

// ── Formula trace tab — compact card per formula ──────────────────────────────

export function FormulaTraceTab({ rows }: { rows: FormulaEval[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No formula evaluations.</p>
  }
  return (
    <div className="space-y-2">
      {rows.map((f, i) => (
        <FormulaCard key={`${f.formulaCode}-${i}`} formula={f} />
      ))}
    </div>
  )
}

function FormulaCard({ formula: f }: { formula: FormulaEval }) {
  const inputEntries = Object.entries(f.inputs ?? {})
  return (
    <div className="overflow-hidden rounded-lg border bg-card text-card-foreground">
      {/* Card header row — code + output param */}
      <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <code className="shrink-0 font-mono text-xs font-medium text-foreground">
            {f.formulaCode}
          </code>
          {f.formulaName && (
            <span className="truncate text-xs text-muted-foreground">
              · {f.formulaName}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
          <ArrowRight className="h-3.5 w-3.5" />
          <code className="font-mono text-xs">{f.outputParamCode}</code>
        </div>
      </div>

      {/* Card body */}
      <div className="space-y-2.5 px-4 py-3">
        {/* Expression */}
        <pre className="overflow-x-auto rounded-md bg-muted/50 px-3 py-2 font-mono text-xs leading-relaxed">
          {f.expression}
        </pre>

        {/* Inputs — compact inline pairs */}
        {inputEntries.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span className="text-xs text-muted-foreground">Inputs:</span>
            {inputEntries.map(([k, v]) => (
              <span key={k} className="inline-flex items-center gap-1 text-xs">
                <span className="font-mono text-muted-foreground">{k}</span>
                <span className="text-muted-foreground/50">=</span>
                <span className="font-mono font-medium tabular-nums">{v}</span>
              </span>
            ))}
          </div>
        )}

        {/* Output */}
        <div className="flex items-center gap-2 border-t pt-2 text-xs">
          <span className="text-muted-foreground">Output</span>
          <span className="font-mono text-sm font-semibold tabular-nums">
            {formatNumeric(f.outputValue)}
          </span>
        </div>
      </div>
    </div>
  )
}
