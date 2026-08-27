"use client"

// Extracted verbatim from cost-breakdown-modal.tsx (P11 [G.6]).
// Pure extraction — the props signature is unchanged.

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
