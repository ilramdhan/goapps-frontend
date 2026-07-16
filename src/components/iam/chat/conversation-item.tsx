"use client"

import { cn } from "@/lib/utils"
import { Conversation, getConversationDisplayName, getConversationAvatar } from "@/types/iam/chat"
import { usePresenceStore } from "@/stores/presence-store"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"
import { format, isToday, isYesterday } from "date-fns"

interface ConversationItemProps {
  conversation: Conversation
  currentUserId: string
  isActive: boolean
  onClick: () => void
}

/**
 * Compact time format for conversation previews — avoids the long
 * "less than a minute ago" strings from formatDistanceToNow which wrap
 * and crowd out the preview text.
 *
 * - < 1h: "5m" (minutes ago, "now" if < 1m)
 * - today: "14:30"
 * - yesterday: "Yesterday"
 * - older: "Jul 15"
 */
export function formatChatTime(dateStr: string): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ""

  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return "now"
  if (diffMin < 60) return `${diffMin}m`
  if (isToday(date)) return format(date, "HH:mm")
  if (isYesterday(date)) return "Yesterday"
  return format(date, "MMM d")
}

export function ConversationItem({ conversation, currentUserId, isActive, onClick }: ConversationItemProps) {
  const isOnline = usePresenceStore((s) => s.isOnline)
  const displayName = getConversationDisplayName(conversation, currentUserId)
  const avatarUrl = getConversationAvatar(conversation, currentUserId)
  const otherUser =
    conversation.type === "DIRECT"
      ? conversation.participants.find((p) => p.userId !== currentUserId)
      : null
  const online = otherUser ? isOnline(otherUser.userId) : false
  const lastMsgTime = conversation.lastMessage?.createdAt
    ? formatChatTime(conversation.lastMessage.createdAt)
    : ""

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-accent transition-colors",
        isActive && "bg-accent"
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback>
            {conversation.type === "GROUP" && !avatarUrl ? (
              <Users className="h-4 w-4" />
            ) : (
              displayName.slice(0, 2).toUpperCase()
            )}
          </AvatarFallback>
        </Avatar>
        {online && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm truncate min-w-0">{displayName}</span>
          {lastMsgTime && (
            <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">{lastMsgTime}</span>
          )}
        </div>
        {conversation.type === "GROUP" && (
          <p className="text-xs text-muted-foreground">
            {conversation.participants.length} member{conversation.participants.length === 1 ? "" : "s"}
          </p>
        )}
        {conversation.lastMessage && (
          <p className="text-xs text-muted-foreground truncate max-w-full">
            {conversation.lastMessage.isDeleted
              ? "[deleted]"
              : conversation.lastMessage.body ||
                (conversation.lastMessage.attachments.length > 0 ? "📎 Attachment" : "")}
          </p>
        )}
      </div>
      {conversation.unreadCount > 0 && (
        <Badge variant="default" className="shrink-0 h-5 min-w-5 text-xs">
          {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
        </Badge>
      )}
    </button>
  )
}
