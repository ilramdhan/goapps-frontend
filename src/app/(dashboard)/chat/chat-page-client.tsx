"use client"

import { useEffect } from "react"
import { useAuth } from "@/providers/auth-provider"
import { useChatStore } from "@/stores/chat-store"
import { useConversations } from "@/hooks/iam/use-chat"
import { ConversationList } from "@/components/iam/chat/conversation-list"
import { MessageThread } from "@/components/iam/chat/message-thread"
import { PageHeader } from "@/components/common/page-header"
import { EmptyState } from "@/components/common/empty-state"
import { getConversationDisplayName } from "@/types/iam/chat"
import ChatLoading from "./loading"

export function ChatPageClient() {
  const { user, isLoading: authLoading } = useAuth()
  const currentUserId = user?.userId ?? ""

  const activeId = useChatStore((s) => s.activeConversationId)
  const setActive = useChatStore((s) => s.setActiveConversation)
  const conversations = useChatStore((s) => s.conversations)
  const setConversations = useChatStore((s) => s.setConversations)

  const { data } = useConversations()
  useEffect(() => {
    if (data) setConversations(data)
  }, [data, setConversations])

  if (authLoading) return <ChatLoading />

  const activeConv = conversations.find((c) => c.conversationId === activeId)

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <PageHeader title="Chat" subtitle="Direct messages and group conversations" />
      <div className="flex flex-1 overflow-hidden border rounded-lg">
        {/* Left: Conversation list */}
        <div className="w-80 shrink-0 border-r">
          <ConversationList currentUserId={currentUserId} className="h-full" />
        </div>
        {/* Right: Message thread */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeConv ? (
            <MessageThread
              conversationId={activeConv.conversationId}
              currentUserId={currentUserId}
              participantCount={activeConv.participants.length}
              conversationName={getConversationDisplayName(activeConv, currentUserId)}
              onClose={() => setActive(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <EmptyState
                title="No conversation selected"
                description="Select a conversation or start a new one."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
