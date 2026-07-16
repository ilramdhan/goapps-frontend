"use client"

import { useEffect, useRef, useMemo, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { useChatStore } from "@/stores/chat-store"
import { useMessages, useSendMessage, useMarkRead, useClearHistory } from "@/hooks/iam/use-chat"
import { MessageBubble } from "./message-bubble"
import { MessageInput } from "./message-input"
import { TypingIndicator } from "./typing-indicator"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog/confirm-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { X, Settings, MoreVertical, Trash2 } from "lucide-react"

interface MessageThreadProps {
  conversationId: string
  currentUserId: string
  participantCount: number
  conversationName: string
  conversationType?: "DIRECT" | "GROUP"
  onClose?: () => void
  onOpenSettings?: () => void
}

export function MessageThread({
  conversationId,
  currentUserId,
  participantCount,
  conversationName,
  conversationType,
  onClose,
  onOpenSettings,
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesMap = useChatStore(useShallow((s) => s.messages))
  const messages = useMemo(() => messagesMap[conversationId] ?? [], [messagesMap, conversationId])
  const setMessages = useChatStore((s) => s.setMessages)
  const typingMap = useChatStore(useShallow((s) => s.typingUsers))
  const typingUsers = useMemo(() => typingMap[conversationId] ?? [], [typingMap, conversationId])
  const [clearHistoryOpen, setClearHistoryOpen] = useState(false)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useMessages(conversationId)
  const { mutate: sendMessage } = useSendMessage(conversationId)
  const { mutate: markRead } = useMarkRead(conversationId)
  const clearHistoryM = useClearHistory(conversationId)

  // Sync TanStack Query pages into Zustand store (pages are newest-first per
  // page but oldest-page-first in the array — flatten then reverse to get
  // chronological oldest-first order for rendering).
  useEffect(() => {
    if (!data) return
    const allMsgs = data.pages.flatMap((p) => p.messages).reverse()
    setMessages(conversationId, allMsgs)
  }, [data, conversationId, setMessages])

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  // Mark as read whenever the active conversation changes.
  useEffect(() => {
    markRead()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  const handleTyping = (isTyping: boolean) => {
    void fetch(`/api/v1/iam/chat/conversations/${encodeURIComponent(conversationId)}/typing`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_typing: isTyping }),
    })
  }

  const otherTypingUsers = typingUsers.filter((u) => u.id !== currentUserId)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
        <div className="min-w-0">
          <span className="text-sm font-semibold truncate block">{conversationName}</span>
          {conversationType === "GROUP" && (
            <span className="text-xs text-muted-foreground">
              {participantCount} member{participantCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {conversationType === "GROUP" && onOpenSettings && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpenSettings}>
              <Settings className="h-4 w-4" />
              <span className="sr-only">Group settings</span>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onClick={() => setClearHistoryOpen(true)}>
                <Trash2 className="h-4 w-4" />
                Clear history
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={clearHistoryOpen}
        onOpenChange={setClearHistoryOpen}
        title="Clear conversation history"
        description="This clears your own view of this conversation's message history. Other participants will still see the full history."
        variant="destructive"
        confirmText="Clear history"
        isLoading={clearHistoryM.isPending}
        onConfirm={() => {
          clearHistoryM.mutate(undefined, { onSuccess: () => setClearHistoryOpen(false) })
        }}
      />

      {/* Load more */}
      {hasNextPage && (
        <button
          type="button"
          className="text-xs text-muted-foreground text-center py-2 hover:underline disabled:opacity-50"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? "Loading..." : "Load earlier messages"}
        </button>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.messageId}
            message={msg}
            isSender={msg.senderUserId === currentUserId}
            participantCount={participantCount}
            senderName={msg.senderName}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator */}
      {otherTypingUsers.length > 0 && <TypingIndicator users={otherTypingUsers} />}

      {/* Input */}
      <MessageInput
        conversationId={conversationId}
        onSend={(body, attachmentIds) => sendMessage({ body, attachmentIds })}
        onTyping={handleTyping}
      />
    </div>
  )
}
