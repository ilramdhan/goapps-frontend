"use client"

import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { useChatStore } from "@/stores/chat-store"
import { ConversationList } from "./conversation-list"
import { MessageThread } from "./message-thread"
import { GroupSettingsPanel } from "./group-settings-panel"
import { useConversations } from "@/hooks/iam/use-chat"
import { getConversationDisplayName } from "@/types/iam/chat"

interface ChatDrawerProps {
  currentUserId: string
}

export function ChatDrawer({ currentUserId }: ChatDrawerProps) {
  const isOpen = useChatStore((s) => s.isOpen)
  const setOpen = useChatStore((s) => s.setOpen)
  const activeId = useChatStore((s) => s.activeConversationId)
  const setActive = useChatStore((s) => s.setActiveConversation)
  const conversations = useChatStore((s) => s.conversations)
  const setConversations = useChatStore((s) => s.setConversations)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { data } = useConversations()
  useEffect(() => {
    if (data) setConversations(data)
  }, [data, setConversations])

  const activeConv = conversations.find((c) => c.conversationId === activeId)

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:max-w-[800px] lg:max-w-[900px] p-0 flex flex-row gap-0"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Chat</SheetTitle>
          <SheetDescription>Conversations and messages</SheetDescription>
        </SheetHeader>

        {/* Conversation list — hidden on mobile when a conversation is active */}
        <div className={`${activeId ? "hidden sm:flex" : "flex"} w-full sm:w-72 border-r flex-col shrink-0`}>
          <ConversationList currentUserId={currentUserId} className="h-full" onClose={() => setOpen(false)} />
        </div>

        {/* Message thread — hidden on mobile when no conversation is active */}
        <div className={`${activeId ? "flex" : "hidden sm:flex"} flex-1 flex-col min-w-0`}>
          {activeConv ? (
            <MessageThread
              conversationId={activeConv.conversationId}
              currentUserId={currentUserId}
              participantCount={activeConv.participants.length}
              conversationName={getConversationDisplayName(activeConv, currentUserId)}
              conversationType={activeConv.type}
              onClose={() => setActive(null)}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </SheetContent>

      {activeConv && activeConv.type === "GROUP" && (
        <GroupSettingsPanel
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          conversation={activeConv}
          currentUserId={currentUserId}
        />
      )}
    </Sheet>
  )
}
