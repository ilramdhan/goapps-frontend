"use client"

import { useEffect, useRef, useMemo, useCallback } from "react"
import { useShallow } from "zustand/react/shallow"
import { useChatStore } from "@/stores/chat-store"
import { useMessages, useSendMessage, useMarkRead } from "@/hooks/iam/use-chat"
import { MessageBubble } from "./message-bubble"
import { MessageInput } from "./message-input"
import { TypingIndicator } from "./typing-indicator"

interface MessageThreadProps {
  conversationId: string
  currentUserId: string
  participantCount: number
}

export function MessageThread({ conversationId, currentUserId, participantCount }: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const messagesMap = useChatStore(useShallow((s) => s.messages))
  const messages = useMemo(() => messagesMap[conversationId] ?? [], [messagesMap, conversationId])
  const setMessages = useChatStore((s) => s.setMessages)
  const typingMap = useChatStore(useShallow((s) => s.typingUsers))
  const typingUsers = useMemo(() => typingMap[conversationId] ?? [], [typingMap, conversationId])

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useMessages(conversationId)
  const { mutate: sendMessage } = useSendMessage(conversationId)
  const { mutate: markRead } = useMarkRead(conversationId)

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

  return (
    <div className="flex flex-col h-full">
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
      {typingUsers.filter((id) => id !== currentUserId).length > 0 && (
        <TypingIndicator userIds={typingUsers.filter((id) => id !== currentUserId)} />
      )}

      {/* Input */}
      <MessageInput onSend={(body) => sendMessage({ body })} onTyping={handleTyping} />
    </div>
  )
}
