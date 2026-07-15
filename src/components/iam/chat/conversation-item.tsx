"use client"

import { cn } from "@/lib/utils"
import { Conversation, getConversationDisplayName, getConversationAvatar } from "@/types/iam/chat"
import { usePresenceStore } from "@/stores/presence-store"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"

interface ConversationItemProps {
  conversation: Conversation
  currentUserId: string
  isActive: boolean
  onClick: () => void
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
    ? formatDistanceToNow(new Date(conversation.lastMessage.createdAt), { addSuffix: true })
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
          <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        {online && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm truncate">{displayName}</span>
          {lastMsgTime && <span className="text-xs text-muted-foreground shrink-0">{lastMsgTime}</span>}
        </div>
        {conversation.lastMessage && (
          <p className="text-xs text-muted-foreground truncate">
            {conversation.lastMessage.isDeleted ? "[deleted]" : conversation.lastMessage.body}
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
