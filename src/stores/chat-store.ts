"use client"

import { create } from "zustand"
import { Conversation, ChatMessage, ChatSSEEvent } from "@/types/iam/chat"

export interface TypingUser {
  id: string
  name: string
}

interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  messages: Record<string, ChatMessage[]> // conversationId → messages (oldest first)
  typingUsers: Record<string, TypingUser[]> // conversationId → users currently typing
  isOpen: boolean

  setConversations: (convs: Conversation[]) => void
  upsertConversation: (conv: Conversation) => void
  setMessages: (convId: string, msgs: ChatMessage[]) => void
  prependMessages: (convId: string, msgs: ChatMessage[]) => void // cursor load-more
  appendMessage: (convId: string, msg: ChatMessage) => void
  updateMessage: (convId: string, msg: ChatMessage) => void
  deleteMessage: (convId: string, msgId: string) => void
  setActiveConversation: (id: string | null) => void
  setTyping: (convId: string, userId: string, userName: string, isTyping: boolean) => void
  decrementUnread: (convId: string) => void
  resetUnread: (convId: string) => void
  setOpen: (open: boolean) => void
  handleSSEEvent: (evt: ChatSSEEvent) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  typingUsers: {},
  isOpen: false,

  setConversations: (convs) => set({ conversations: convs }),

  upsertConversation: (conv) =>
    set((s) => {
      const idx = s.conversations.findIndex((c) => c.conversationId === conv.conversationId)
      if (idx >= 0) {
        const next = [...s.conversations]
        next[idx] = conv
        return { conversations: next }
      }
      return { conversations: [conv, ...s.conversations] }
    }),

  setMessages: (convId, msgs) => set((s) => ({ messages: { ...s.messages, [convId]: msgs } })),

  prependMessages: (convId, msgs) =>
    set((s) => ({
      messages: { ...s.messages, [convId]: [...msgs, ...(s.messages[convId] ?? [])] },
    })),

  appendMessage: (convId, msg) =>
    set((s) => ({
      messages: { ...s.messages, [convId]: [...(s.messages[convId] ?? []), msg] },
    })),

  updateMessage: (convId, updated) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [convId]: (s.messages[convId] ?? []).map((m) => (m.messageId === updated.messageId ? updated : m)),
      },
    })),

  deleteMessage: (convId, msgId) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [convId]: (s.messages[convId] ?? []).map((m) =>
          m.messageId === msgId ? { ...m, isDeleted: true, body: "[deleted]" } : m
        ),
      },
    })),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setTyping: (convId, userId, userName, isTyping) =>
    set((s) => {
      const current = s.typingUsers[convId] ?? []
      const next = isTyping
        ? current.some((u) => u.id === userId)
          ? current
          : [...current, { id: userId, name: userName }]
        : current.filter((u) => u.id !== userId)
      return { typingUsers: { ...s.typingUsers, [convId]: next } }
    }),

  decrementUnread: (convId) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.conversationId === convId ? { ...c, unreadCount: Math.max(0, c.unreadCount - 1) } : c
      ),
    })),

  resetUnread: (convId) =>
    set((s) => ({
      conversations: s.conversations.map((c) => (c.conversationId === convId ? { ...c, unreadCount: 0 } : c)),
    })),

  setOpen: (open) => set({ isOpen: open }),

  handleSSEEvent: (evt) => {
    const { appendMessage, updateMessage, deleteMessage, setTyping, activeConversationId } = get()
    const convId = evt.conversationId ?? ""
    switch (evt.type) {
      case "message_received":
        if (evt.message) {
          appendMessage(convId, evt.message)
          set((s) => ({
            conversations: s.conversations.map((c) => {
              if (c.conversationId !== convId) return c
              const isActive = activeConversationId === convId
              return {
                ...c,
                lastMessage: evt.message!,
                unreadCount: isActive ? c.unreadCount : c.unreadCount + 1,
                updatedAt: evt.message!.createdAt || c.updatedAt,
              }
            }),
          }))
        }
        break
      case "message_edited":
        if (evt.message) updateMessage(convId, evt.message)
        break
      case "message_deleted":
        if (evt.messageId) deleteMessage(convId, evt.messageId)
        break
      case "typing":
        if (evt.userId) setTyping(convId, evt.userId, evt.userName ?? "Someone", evt.isTyping ?? false)
        break
      default:
        break
    }
  },
}))
