// Client-safe cost sheet export layout helpers (no proto imports).

export type ExportLayout = "COMBINED" | "HORIZONTAL" | "VERTICAL"

export const EXPORT_LAYOUT_LABEL: Record<ExportLayout, string> = {
  COMBINED: "Combined",
  HORIZONTAL: "Horizontal",
  VERTICAL: "Vertical",
}

// normalizeExportLayout accepts the numeric enum (2=HORIZONTAL, 3=VERTICAL) or
// any string form (short or COST_SHEET_EXPORT_LAYOUT_*). Unspecified/unknown
// values (e.g. jobs queued before the field existed) are COMBINED.
export function normalizeExportLayout(v: unknown): ExportLayout {
  if (typeof v === "number") {
    if (v === 2) return "HORIZONTAL"
    if (v === 3) return "VERTICAL"
    return "COMBINED"
  }
  const t = String(v ?? "").toUpperCase()
  if (t.endsWith("HORIZONTAL")) return "HORIZONTAL"
  if (t.endsWith("VERTICAL")) return "VERTICAL"
  return "COMBINED"
}

// Only COMBINED and VERTICAL fan out into multiple 200-product files;
// HORIZONTAL is always a single file.
export function layoutChunksFiles(layout: ExportLayout): boolean {
  return layout !== "HORIZONTAL"
}
