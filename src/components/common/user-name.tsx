"use client"

// UserName — resolves an IAM user UUID to "Full Name (@username)" via the
// existing useUser hook. Cached by TanStack Query so multiple displays of
// the same id share a single fetch. Falls back to the id itself only briefly
// while loading; after fetch, always shows a human label per
// feedback_no_uuid_input.md.
import { useUser } from "@/hooks/iam/use-users"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface Props {
  userId: string | undefined | null
  className?: string
  // Compact mode hides the @username suffix (used inside Badge etc.).
  compact?: boolean
}

export function UserName({ userId, className, compact = false }: Props) {
  const isUUID = !!userId && UUID_PATTERN.test(userId)
  // Some actor fields (e.g. mst_mb_workflow_log.mbwl_actor_user_id) store a plain
  // username or service-account string rather than an IAM UUID — skip the lookup
  // and render it directly instead of failing and showing "Unknown user".
  const { data: resp, isLoading, error } = useUser(isUUID ? userId! : "")
  const detail = resp?.data ?? null
  const username = detail?.user?.username || ""
  const fullName = detail?.detail?.fullName || ""

  if (!userId) return <span className={className}>—</span>
  if (!isUUID) {
    return (
      <span className={className} title={userId}>
        {userId}
      </span>
    )
  }
  if (isLoading) {
    return (
      <span className={className} title={userId}>
        Loading…
      </span>
    )
  }
  if (error || !detail) {
    return (
      <span className={className} title={userId}>
        Unknown user
      </span>
    )
  }

  const display = fullName || username || "—"
  return (
    <span className={className} title={userId}>
      {display}
      {!compact && username && display !== username && (
        <span className="text-muted-foreground"> (@{username})</span>
      )}
    </span>
  )
}
