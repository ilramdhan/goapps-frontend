"use client"

import { MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useChatStore } from "@/stores/chat-store"
import { Badge } from "@/components/ui/badge"

export function ChatFab() {
  const setOpen = useChatStore((s) => s.setOpen)
  const isOpen = useChatStore((s) => s.isOpen)
  const totalUnread = useChatStore((s) => s.conversations.reduce((sum, c) => sum + c.unreadCount, 0))

  return (
    <div className="relative">
      <Button
        size="icon"
        className="h-12 w-12 rounded-full shadow-lg"
        onClick={() => setOpen(!isOpen)}
        aria-label="Chat"
      >
        <MessageSquare className="h-5 w-5" />
      </Button>
      {totalUnread > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 min-w-5 text-xs flex items-center justify-center rounded-full p-0 px-1"
        >
          {totalUnread > 99 ? "99+" : totalUnread}
        </Badge>
      )}
    </div>
  )
}
