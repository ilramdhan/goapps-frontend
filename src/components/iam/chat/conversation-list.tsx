"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SquarePen } from "lucide-react"
import { useChatStore } from "@/stores/chat-store"
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
