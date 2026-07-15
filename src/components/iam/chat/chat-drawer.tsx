"use client"

import { useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { useChatStore } from "@/stores/chat-store"
import { ConversationList } from "./conversation-list"
import { MessageThread } from "./message-thread"
import { useConversations } from "@/hooks/iam/use-chat"

interface ChatDrawerProps {
  currentUserId: string
}

export function ChatDrawer({ currentUserId }: ChatDrawerProps) {
  const isOpen = useChatStore((s) => s.isOpen)
  const setOpen = useChatStore((s) => s.setOpen)
  const activeId = useChatStore((s) => s.activeConversationId)
  const conversations = useChatStore((s) => s.conversations)
  const setConversations = useChatStore((s) => s.setConversations)

  const { data } = useConversations()
  useEffect(() => {
    if (data) setConversations(data)
  }, [data, setConversations])

  const activeConv = conversations.find((c) => c.conversationId === activeId)

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-[800px] sm:max-w-none lg:w-[900px] p-0 flex flex-row gap-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Chat</SheetTitle>
          <SheetDescription>Conversations and messages</SheetDescription>
        </SheetHeader>
        <div className="w-72 border-r flex flex-col shrink-0">
          <ConversationList currentUserId={currentUserId} className="h-full" />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          {activeConv ? (
            <MessageThread
              conversationId={activeConv.conversationId}
              currentUserId={currentUserId}
              participantCount={activeConv.participants.length}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
