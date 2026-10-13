export function fmtDate(ts: string | null | undefined): string {
  if (!ts) return "—"
  try {
    return new Date(ts).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  } catch {
    return ts
  }
}

export function fmtDuration(ms: number): string {
  if (!ms || ms <= 0) return "—"
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${(ms / 1000).toFixed(1)}s`
  const m = Math.floor(s / 60)
  const rem = s - m * 60
  if (m < 60) return `${m}m ${rem}s`
  const h = Math.floor(m / 60)
  return `${h}h ${m - h * 60}m`
}

export function prettyJson(s: string): string {
  if (!s) return ""
  try {
    return JSON.stringify(JSON.parse(s), null, 2)
  } catch {
    return s
  }
}

/** Extracts the `notes` string[] from a calculation log JSON; [] if absent/invalid. */
export function parseCalcNotes(s: string): string[] {
  if (!s) return []
  try {
    const notes = (JSON.parse(s) as { notes?: unknown } | null)?.notes
    return Array.isArray(notes) ? notes.filter((n): n is string => typeof n === "string" && n !== "") : []
  } catch {
    return []
  }
}
