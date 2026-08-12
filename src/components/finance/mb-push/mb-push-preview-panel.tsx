"use client";

import { useEffect, useState } from "react";
import { Ban, Loader2, RefreshCw, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/common/empty-state";
import { KpiCard } from "@/components/common/kpi-card";
import { KpiGrid } from "@/components/common/kpi-grid";

import {
  usePreviewPushToHead,
  useExecutePushToHead,
} from "@/hooks/finance/use-mb-push";

interface MbPushPreviewPanelProps {
  period: string;
}

export function MbPushPreviewPanel({ period }: MbPushPreviewPanelProps) {
  const { data, isLoading, isFetching } = usePreviewPushToHead(period);
  const executeMutation = useExecutePushToHead();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const pushable = data?.pushable ?? [];
  const skipped = data?.skipped ?? [];
  const needsRepushCount = data?.needsRepushCount ?? 0;

  useEffect(() => {
    setSelected(new Set(pushable.map((p) => p.mbhId)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, data]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === pushable.length
        ? new Set()
        : new Set(pushable.map((p) => p.mbhId)),
    );
  }

  async function handleExecute() {
    if (selected.size === 0) return;
    try {
      await executeMutation.mutateAsync({
        period,
        mbHeadIds: Array.from(selected),
      });
    } catch {
      // toast handled in hook
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-10 justify-center text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading preview…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <KpiGrid cols={3}>
        <KpiCard title="Pushable" value={pushable.length} icon={Send} />
        <KpiCard
          title="Needs Re-push"
          value={needsRepushCount}
          icon={RefreshCw}
          variant={needsRepushCount > 0 ? "warning" : "default"}
        />
        <KpiCard title="Skipped" value={skipped.length} icon={Ban} />
      </KpiGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">
              Pushable{" "}
              {isFetching && (
                <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />
              )}
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {selected.size}/{pushable.length} selected
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            {pushable.length === 0 ? (
              <EmptyState
                title="No pushable MB Heads"
                description="Nothing eligible to push for this period."
              />
            ) : (
              <>
                <div className="flex items-center gap-2 border-b pb-2">
                  <Checkbox
                    checked={
                      selected.size === pushable.length && pushable.length > 0
                    }
                    onCheckedChange={toggleAll}
                  />
                  <span className="text-xs text-muted-foreground">
                    Select all
                  </span>
                </div>
                <div className="max-h-96 space-y-1 overflow-y-auto">
                  {pushable.map((p) => (
                    <label
                      key={p.mbhId}
                      className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selected.has(p.mbhId)}
                        onCheckedChange={() => toggle(p.mbhId)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs">{p.code}</span>
                          {p.needsRepush && (
                            <span
                              className="inline-flex shrink-0 items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                              title="Already pushed for this period, but the pushed cost was superseded by a later MB Batch run. Re-push to refresh it."
                            >
                              <RefreshCw className="h-2.5 w-2.5" />
                              Needs re-push
                            </span>
                          )}
                        </div>
                        <div className="truncate text-sm">{p.name}</div>
                      </div>
                      <div className="flex shrink-0 gap-1 text-[10px] text-muted-foreground">
                        {p.hasActual && (
                          <span className="rounded bg-muted px-1.5 py-0.5">
                            Actual
                          </span>
                        )}
                        {p.hasSelling && (
                          <span className="rounded bg-muted px-1.5 py-0.5">
                            Selling
                          </span>
                        )}
                        {p.hasForecast && (
                          <span className="rounded bg-muted px-1.5 py-0.5">
                            Forecast
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
                <Button
                  onClick={handleExecute}
                  disabled={selected.size === 0 || executeMutation.isPending}
                  className="w-full"
                >
                  {executeMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Push {selected.size} to Head
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Skipped</CardTitle>
          </CardHeader>
          <CardContent>
            {skipped.length === 0 ? (
              <EmptyState
                title="Nothing skipped"
                description="All eligible MB Heads are pushable."
              />
            ) : (
              <div className="max-h-96 space-y-1 overflow-y-auto">
                {skipped.map((s) => (
                  <div key={s.mbhId} className="rounded-md border px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs">{s.code}</span>
                    </div>
                    <div className="text-sm">{s.name}</div>
                    <div className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                      {s.reason}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
