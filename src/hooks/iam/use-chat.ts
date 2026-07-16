// TanStack Query hooks for chat. Hits BFF routes only (never the gRPC backend
// directly) — see src/app/api/v1/iam/chat/** for the route implementations.

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Conversation,
  ChatMessage,
  RawConversation,
  RawMessage,
  RawEditHistoryEntry,
  EditHistoryEntry,
  normalizeConversation,
  normalizeMessage,
  normalizeEditHistoryEntry,
} from "@/types/iam/chat"

interface BFFEnvelope<T> {
  base?: { isSuccess?: boolean; statusCode?: string; message?: string; validationErrors?: unknown[] }
  data?: T
  pagination?: { currentPage: number; pageSize: number; totalItems: number | string; totalPages: number }
}

interface RawMessagesPage {
  messages?: RawMessage[]
  nextCursor?: string
  next_cursor?: string
  hasMore?: boolean
  has_more?: boolean
}

interface MessagesPage {
  messages: ChatMessage[]
  nextCursor: string
  hasMore: boolean
}

export const chatKeys = {
  all: ["iam", "chat"] as const,
  conversations: () => ["iam", "chat", "conversations"] as const,
  messages: (convId: string) => ["iam", "chat", "messages", convId] as const,
}

async function parseEnvelope<T>(res: Response): Promise<BFFEnvelope<T>> {
  const json = (await res.json()) as BFFEnvelope<T>
  if (json.base && json.base.isSuccess === false) {
    throw new Error(json.base.message || "Request failed")
  }
  return json
}

export function useConversations() {
  return useQuery({
    queryKey: chatKeys.conversations(),
    queryFn: async (): Promise<Conversation[]> => {
      const res = await fetch("/api/v1/iam/chat/conversations?page=1&pageSize=50", { credentials: "include" })
      const json = await parseEnvelope<RawConversation[]>(res)
      return (json.data ?? []).map(normalizeConversation)
    },
    staleTime: 0,
  })
}

export function useMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: chatKeys.messages(conversationId),
    queryFn: async ({ pageParam }): Promise<MessagesPage> => {
      const url = `/api/v1/iam/chat/conversations/${encodeURIComponent(conversationId)}/messages?pageSize=30${
        pageParam ? `&beforeCursor=${encodeURIComponent(pageParam)}` : ""
      }`
      const res = await fetch(url, { credentials: "include" })
      const json = await parseEnvelope<RawMessagesPage>(res)
      const data = json.data ?? {}
      return {
        messages: (data.messages ?? []).map(normalizeMessage),
        nextCursor: data.nextCursor ?? data.next_cursor ?? "",
        hasMore: data.hasMore ?? data.has_more ?? false,
      }
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    enabled: !!conversationId,
  })
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ body, replyToId }: { body: string; replyToId?: string }): Promise<ChatMessage> => {
      const res = await fetch(`/api/v1/iam/chat/conversations/${encodeURIComponent(conversationId)}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, reply_to_id: replyToId }),
      })
      const json = await parseEnvelope<RawMessage>(res)
      return normalizeMessage(json.data ?? {})
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chatKeys.messages(conversationId) })
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() })
    },
  })
}

export function useMarkRead(conversationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const res = await fetch(`/api/v1/iam/chat/conversations/${encodeURIComponent(conversationId)}/read`, {
        method: "POST",
        credentials: "include",
      })
      await parseEnvelope<unknown>(res)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() })
    },
  })
}

export interface CreateConversationInput {
  peerUserId?: string
  name?: string
  participantIds?: string[]
}

export function useCreateConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateConversationInput): Promise<Conversation> => {
      const res = await fetch("/api/v1/iam/chat/conversations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          peer_user_id: input.peerUserId,
          name: input.name,
          participant_ids: input.participantIds,
        }),
      })
      const json = await parseEnvelope<RawConversation>(res)
      return normalizeConversation(json.data ?? {})
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chatKeys.conversations() })
    },
  })
}

export function useEditMessage(conversationId: string, messageId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ body }: { body: string }): Promise<ChatMessage> => {
      const res = await fetch(
        `/api/v1/iam/chat/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        }
      )
      const json = await parseEnvelope<RawMessage>(res)
      return normalizeMessage(json.data ?? {})
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chatKeys.messages(conversationId) })
    },
  })
}

export function useDeleteMessage(conversationId: string, messageId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const res = await fetch(
        `/api/v1/iam/chat/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      )
      await parseEnvelope<unknown>(res)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: chatKeys.messages(conversationId) })
    },
  })
}

export function useEditHistory(conversationId: string, messageId: string, enabled = true) {
  return useQuery({
    queryKey: ["iam", "chat", "messages", conversationId, messageId, "history"] as const,
    queryFn: async (): Promise<EditHistoryEntry[]> => {
      const res = await fetch(
        `/api/v1/iam/chat/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/history`,
        { credentials: "include" }
      )
      const json = await parseEnvelope<RawEditHistoryEntry[]>(res)
      return (json.data ?? []).map(normalizeEditHistoryEntry)
    },
    enabled: enabled && !!conversationId && !!messageId,
    staleTime: 0,
  })
}
