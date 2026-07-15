"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SquarePen } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useChatStore } from "@/stores/chat-store"
import { usePresenceStore } from "@/stores/presence-store"
import { useCreateConversation } from "@/hooks/iam/use-chat"
import { UserAvatar } from "@/components/common/user-avatar"
import { UserName } from "@/components/common/user-name"
import { ConversationItem } from "./conversation-item"
import { NewConversationDialog } from "./new-conversation-dialog"

interface ConversationListProps {
  currentUserId: string
  className?: string
}

export function ConversationList({ currentUserId, className }: ConversationListProps) {
  const [search, setSearch] = useState("")
  const [showNew, setShowNew] = useState(false)
  const conversations = useChatStore((s) => s.conversations)
  const activeId = useChatStore((s) => s.activeConversationId)
  const setActive = useChatStore((s) => s.setActiveConversation)
  const onlineUsers = usePresenceStore((s) => s.onlineUsers)
  const { mutate: createConv } = useCreateConversation()

  const onlineList = useMemo(
    () => Array.from(onlineUsers).filter((id) => id !== currentUserId),
    [onlineUsers, currentUserId]
  )

  const handleOnlineUserClick = (userId: string) => {
    createConv(
      { peerUserId: userId },
      { onSuccess: (conv) => { if (conv?.conversationId) setActive(conv.conversationId) } }
    )
  }

  const filtered = conversations.filter((c) => {
    if (!search) return true
    const name =
      c.type === "DIRECT"
        ? c.participants.find((p) => p.userId !== currentUserId)?.fullName ?? ""
        : c.name
    return name.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className={`flex flex-col h-full ${className ?? ""}`}>
      <div className="p-3 flex items-center gap-2 border-b">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-sm"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setShowNew(true)}
          aria-label="New conversation"
        >
          <SquarePen className="h-4 w-4" />
        </Button>
      </div>
      {onlineList.length > 0 && (
        <div className="px-3 py-2 border-b">
          <p className="text-xs text-muted-foreground mb-1.5">{onlineList.length} online</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {onlineList.map((uid) => (
              <Tooltip key={uid}>
                <TooltipTrigger asChild>
                  <button onClick={() => handleOnlineUserClick(uid)} className="relative shrink-0">
                    <UserAvatar userId={uid} colorHash className="h-8 w-8" fallbackClassName="text-xs" />
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <UserName userId={uid} compact />
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {filtered.map((conv) => (
          <ConversationItem
            key={conv.conversationId}
            conversation={conv}
            currentUserId={currentUserId}
            isActive={activeId === conv.conversationId}
            onClick={() => setActive(conv.conversationId)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No conversations</p>
        )}
      </div>
      <NewConversationDialog open={showNew} onOpenChange={setShowNew} />
    </div>
  )
}
