"use client"

// ChatProvider listens to "event: chat" frames from the shared SSE connection
// established by notification-provider.tsx (window.__sharedEventSource) and
// delegates all state updates to chat-store.handleSSEEvent.
//
// notification-provider.tsx only assigns window.__sharedEventSource inside its
// own effect. Because React fires child effects before parent effects, this
// provider's effect can run *before* that assignment happens (e.g. on first
// mount while already authenticated, or right after a fresh login). A single
// read-once attempt would silently miss the connection, so we poll briefly
// until the EventSource instance shows up (or changes, e.g. after a
// logout/login cycle) instead of attaching only once.

import { useEffect, useRef, useCallback } from "react"
import { useChatStore } from "@/stores/chat-store"
import { showChatNotification } from "@/lib/notifications/browser-notification"
import { playNotificationSound } from "@/lib/notifications/notification-sound"
import type { ChatSSEEvent, ChatMessage } from "@/types/iam/chat"

const POLL_INTERVAL_MS = 200

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const handleSSEEvent = useChatStore((s) => s.handleSSEEvent)
  const activeConvId = useChatStore((s) => s.activeConversationId)
  const conversations = useChatStore((s) => s.conversations)
  const attachedRef = useRef<EventSource | null>(null)
  const activeConvRef = useRef(activeConvId)
  activeConvRef.current = activeConvId

  const updateTabTitle = useCallback(() => {
    const total = conversations.reduce((sum, c) => sum + c.unreadCount, 0)
    const base = document.title.replace(/^\(\d+\)\s*/, "")
    document.title = total > 0 ? `(${total}) ${base}` : base
  }, [conversations])

  useEffect(() => {
    updateTabTitle()
  }, [updateTabTitle])

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      try {
        const raw = JSON.parse(e.data) as ChatSSEEvent
        if ((raw.type === "message_received" || raw.type === "message_edited") && !raw.message && raw.messageId) {
          raw.message = {
            messageId: raw.messageId ?? "",
            conversationId: raw.conversationId ?? "",
            senderUserId: raw.senderUserId ?? "",
            senderName: raw.senderName ?? "",
            body: raw.body ?? "",
            isEdited: raw.isEdited ?? false,
            isDeleted: raw.isDeleted ?? false,
            replyToId: raw.replyToId ?? "",
            readReceipts: raw.readReceipts ?? [],
            createdAt: raw.createdAt ?? "",
            updatedAt: raw.updatedAt ?? "",
          } satisfies ChatMessage
        }
        handleSSEEvent(raw)
        if (raw.type === "message_received" && raw.conversationId !== activeConvRef.current) {
          const senderName = raw.senderName ?? raw.userName ?? "Someone"
          const body = raw.body ?? ""
          showChatNotification(senderName, body, raw.conversationId ?? "")
          playNotificationSound()
        }
      } catch {
        // ignore malformed events
      }
    }

    const tryAttach = () => {
      const es = window.__sharedEventSource
      if (es && attachedRef.current !== es) {
        if (attachedRef.current) attachedRef.current.removeEventListener("chat", handler as EventListener)
        es.addEventListener("chat", handler as EventListener)
        attachedRef.current = es
      } else if (!es && attachedRef.current) {
        // Connection torn down (e.g. logout) — the EventSource is gone along
        // with its listeners, just drop our reference so we re-attach later.
        attachedRef.current = null
      }
    }

    tryAttach()
    const intervalId = setInterval(tryAttach, POLL_INTERVAL_MS)

    return () => {
      clearInterval(intervalId)
      if (attachedRef.current) attachedRef.current.removeEventListener("chat", handler as EventListener)
      attachedRef.current = null
    }
  }, [handleSSEEvent])

  return <>{children}</>
}
