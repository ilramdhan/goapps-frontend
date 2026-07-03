"use client"

// UserAvatar — shared avatar component. Renders the user's uploaded photo
// (mst_user.profile_picture_url, surfaced as `profilePictureUrl` on UserDetail)
// when available, falling back to initials. Consolidates three previously
// duplicated implementations:
//   - cost-request-comment/comments-panel.tsx's `UserInitials` (deterministic
//     per-userId color hash fallback — pass `colorHash` to reproduce that look)
//   - nav/nav-user.tsx (plain shadcn fallback, already-resolved avatar/name)
//   - profile/profile-header.tsx (plain shadcn fallback, already-resolved avatarUrl/name)
//
// Callers that already have `avatarUrl`/`fullName` (nav-user, profile-header)
// pass them directly and no lookup happens. Callers that only have a `userId`
// (comment threads) let this component resolve both via useUser().
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUser as useIamUser } from "@/hooks/iam/use-users"

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-cyan-100 text-cyan-700",
]

/** Deterministic per-userId color hash — same user always gets the same color. */
function avatarColor(userId: string): string {
  const hash = (userId || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export interface UserAvatarProps {
  /** IAM user id. When `avatarUrl`/`fullName` aren't passed directly, both are resolved via useUser(). */
  userId?: string | null
  /** Pre-resolved full name — skips the name portion of the lookup when provided. */
  fullName?: string
  /** Pre-resolved avatar URL — skips the avatar portion of the lookup when provided. */
  avatarUrl?: string | null
  /** Applied to the outer Avatar element — controls size/shape, e.g. "h-8 w-8 rounded-lg". */
  className?: string
  /** Applied to AvatarFallback — controls fallback text styling. */
  fallbackClassName?: string
  /**
   * When true, the fallback background uses the deterministic per-userId color hash
   * (the look originally used in comment threads' `UserInitials`). Defaults to false,
   * matching the plain shadcn muted fallback already used by nav-user/profile-header.
   */
  colorHash?: boolean
}

export function UserAvatar({
  userId,
  fullName: fullNameProp,
  avatarUrl: avatarUrlProp,
  className,
  fallbackClassName,
  colorHash = false,
}: UserAvatarProps) {
  // Only hit the network when the caller hasn't already resolved both fields
  // (mirrors the enabled: !!id guard inside useUser/createCrudHooks).
  const needsLookup = fullNameProp === undefined || avatarUrlProp === undefined
  const { data: resp } = useIamUser(needsLookup ? userId || "" : "")
  const detail = resp?.data?.detail

  const fullName = fullNameProp ?? detail?.fullName ?? ""
  const avatarUrl = avatarUrlProp ?? detail?.profilePictureUrl ?? undefined

  const initials = fullName
    ? fullName.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : (userId || "?").charAt(0).toUpperCase()

  const hashClass = colorHash && userId ? avatarColor(userId) : ""

  return (
    <Avatar className={className} title={fullName || userId || undefined}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName || userId || "User"} />}
      <AvatarFallback className={[hashClass, fallbackClassName].filter(Boolean).join(" ")}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}
