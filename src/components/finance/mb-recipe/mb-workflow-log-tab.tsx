"use client"

// MbWorkflowLogTab — audit trail of MB Head status transitions.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/common/empty-state"
import { UserName } from "@/components/common/user-name"
import { useMbWorkflowLogs } from "@/hooks/finance/use-mb-workflow-log"

interface Props {
  mbhId: string
}

function humanizeEnumValue(value: string): string {
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

export function MbWorkflowLogTab({ mbhId }: Props) {
  const { data, isLoading } = useMbWorkflowLogs(mbhId)
  const logs = data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Workflow log</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        )}
        {!isLoading && logs.length === 0 && (
          <EmptyState title="No transitions yet" description="Status changes will appear here." />
        )}
        {!isLoading && logs.length > 0 && (
          <ol className="space-y-4">
            {logs.map((log) => (
              <li key={log.mbwlId} className="border-l-2 pl-4 relative">
                <span className="absolute -left-[3px] top-1 h-2 w-2 rounded-full bg-primary" />
                <div className="flex flex-wrap items-center gap-1.5 text-sm">
                  <span className="text-muted-foreground">{humanizeEnumValue(log.fromState || "—")}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">{humanizeEnumValue(log.toState)}</span>
                  <span className="text-xs text-muted-foreground">· v{log.version}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  <UserName userId={log.actorUserId} compact /> · {new Date(log.actorAt).toLocaleString()}
                </div>
                {log.reason && (
                  <p className="text-sm mt-1 whitespace-pre-wrap">{log.reason}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
