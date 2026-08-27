/**
 * R17 regression guard.
 *
 * Real `position: sticky` behavior depends on actual browser scroll geometry,
 * which jsdom does not implement — so this cannot be verified by mounting the
 * component and scrolling it. It WAS verified empirically outside this test
 * suite with a Playwright probe that reproduced the dashboard shell's exact
 * ancestor chain (SidebarProvider → SidebarInset → content wrapper → <main>):
 * with `overflow-x-hidden` on the content wrapper, a `sticky` element inside
 * page content never pinned on scroll; with `overflow-x-clip`, it pinned
 * correctly at the expected offset. Root cause: `overflow-x-hidden` forces
 * `overflow-y: auto` per the CSS overflow spec, turning that wrapper (which
 * never actually scrolls — its height is unbounded) into the sticky
 * containing block instead of the viewport.
 *
 * This test is a source-level guard against that specific regression
 * recurring, not a substitute for real browser verification.
 */
import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const layoutPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../app/(dashboard)/layout.tsx",
)

describe("dashboard shell content wrapper — overflow class (R17)", () => {
  it("uses overflow-x-clip, never overflow-x-hidden, on the wrapper around {children}", () => {
    const source = readFileSync(layoutPath, "utf8")
    // Isolate the actual className line (not the explanatory comment above it,
    // which legitimately mentions "overflow-x-hidden" as the thing NOT to use).
    const classNameLine = source
      .split("\n")
      .find((line) => line.includes("className") && line.includes("gap-4") && line.includes("pt-0"))
    expect(classNameLine, "expected to find the content wrapper's className line").toBeTruthy()
    expect(classNameLine).toContain("overflow-x-clip")
    expect(classNameLine).not.toContain("overflow-x-hidden")
  })
})
