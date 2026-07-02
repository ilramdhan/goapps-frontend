import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface KpiGridProps {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}

// Every layout is 2 columns below lg. When the card count is odd the last card
// would leave an empty bottom-right hole, so it spans the full row on the 2-col
// layout: `:last-child:nth-child(odd)` only matches when the total count is odd
// (even counts are unaffected). At lg — where 3/4-col layouts kick in — the span
// resets to 1.
const oddLastSpan =
  "[&>*:last-child:nth-child(odd)]:col-span-2 lg:[&>*:last-child:nth-child(odd)]:col-span-1";

const colsClass: Record<NonNullable<KpiGridProps["cols"]>, string> = {
  2: "grid-cols-2 [&>*:last-child:nth-child(odd)]:col-span-2",
  3: `grid-cols-2 lg:grid-cols-3 ${oddLastSpan}`,
  4: `grid-cols-2 lg:grid-cols-4 ${oddLastSpan}`,
};

// KpiGrid is the responsive wrapper for a row of KpiCards.
export function KpiGrid({ children, cols = 4, className }: KpiGridProps) {
  return <div className={cn("grid gap-4", colsClass[cols], className)}>{children}</div>;
}
