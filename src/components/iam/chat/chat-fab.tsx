"use client"

import { MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useChatStore } from "@/stores/chat-store"
import { usePresenceStore } from "@/stores/presence-store"
import { Badge } from "@/components/ui/badge"

export function ChatFab() {
  const setOpen = useChatStore((s) => s.setOpen)
  const isOpen = useChatStore((s) => s.isOpen)
  const totalUnread = useChatStore((s) => s.conversations.reduce((sum, c) => sum + c.unreadCount, 0))
  const onlineCount = usePresenceStore((s) => s.onlineUsers.size)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
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
          {onlineCount > 0 && (
            <span className="absolute -bottom-0.5 -right-0.5 flex items-center gap-0.5 bg-background rounded-full px-1 py-0.5 text-[10px] text-green-600 font-medium border">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              {onlineCount}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="left">
        <p>Chat{onlineCount > 0 ? ` · ${onlineCount} online` : ""}</p>
      </TooltipContent>
    </Tooltip>
  )
}
