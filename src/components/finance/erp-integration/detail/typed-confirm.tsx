"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Props {
  /** Exact text the operator must type, e.g. `${period}/${batchId}`. */
  expected: string
  /** ISO timestamp after which the confirmation is no longer valid. */
  expiresAt?: string
  onConfirm: () => void
  disabled?: boolean
  label: string
}

function remainingSeconds(expiresAt?: string): number | null {
  if (!expiresAt) return null
  const t = Date.parse(expiresAt)
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.floor((t - Date.now()) / 1000))
}

/** Typed-confirmation gate: execute stays disabled until the text matches exactly. */
export function TypedConfirm({ expected, expiresAt, onConfirm, disabled, label }: Props) {
  const [value, setValue] = useState("")
  const [left, setLeft] = useState<number | null>(() => remainingSeconds(expiresAt))

  useEffect(() => {
    if (!expiresAt) return
    const id = setInterval(() => setLeft(remainingSeconds(expiresAt)), 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  const expired = left !== null && left <= 0
  const mm = left === null ? "" : String(Math.floor(left / 60)).padStart(2, "0")
  const ss = left === null ? "" : String(left % 60).padStart(2, "0")

  return (
    <div className="space-y-2">
      <p className="text-sm">
        Type <code className="rounded bg-muted px-1 font-mono">{expected}</code> to confirm.
      </p>
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={expected}
          className="max-w-xs font-mono"
          aria-label="Confirmation text"
        />
        <Button onClick={onConfirm} disabled={disabled || expired || value !== expected}>
          {label}
        </Button>
      </div>
      {left !== null && (
        <p className={expired ? "text-sm text-destructive" : "text-xs text-muted-foreground"}>
          {expired ? "Preview expired: rebuild it" : `Preview expires in ${mm}:${ss}`}
        </p>
      )}
    </div>
  )
}
