"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SquarePen } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useChatStore } from "@/stores/chat-store"
import { usePresenceStore } from "@/stores/presence-store"
import { useCreateConversation } from "@/hooks/iam/use-chat"
import { useUsersLookup } from "@/hooks/iam/use-users-lookup"
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
  const { lookup } = useUsersLookup()
  const { mutate: createConv } = useCreateConversation()

  const [onlineList, setOnlineList] = useState<Array<{ id: string; name: string; initials: string }>>([])

  useEffect(() => {
    const list = Array.from(onlineUsers)
      .filter((id) => id !== currentUserId)
      .map((id) => {
        const user = lookup.get(id)
        const name = user?.fullName || user?.username || id.slice(0, 8)
        const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
        return { id, name, initials }
      })
    setOnlineList(list)
  }, [onlineUsers, lookup, currentUserId])

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
            {onlineList.map((u) => (
              <Tooltip key={u.id}>
                <TooltipTrigger asChild>
                  <button onClick={() => handleOnlineUserClick(u.id)} className="relative shrink-0">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{u.initials}</AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">{u.name}</TooltipContent>
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
