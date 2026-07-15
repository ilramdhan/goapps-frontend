"use client"

import { useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useChatStore } from "@/stores/chat-store"
import { ConversationList } from "./conversation-list"
import { MessageThread } from "./message-thread"
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

  const { data } = useConversations()
  useEffect(() => {
    if (data) setConversations(data)
  }, [data, setConversations])

  const activeConv = conversations.find((c) => c.conversationId === activeId)

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full sm:max-w-[800px] lg:max-w-[900px] p-0 flex flex-row gap-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Chat</SheetTitle>
          <SheetDescription>Conversations and messages</SheetDescription>
        </SheetHeader>

        {/* Conversation list — hidden on mobile when a conversation is active */}
        <div className={`${activeId ? "hidden sm:flex" : "flex"} w-full sm:w-72 border-r flex-col shrink-0`}>
          <ConversationList currentUserId={currentUserId} className="h-full" />
        </div>

        {/* Message thread — hidden on mobile when no conversation is active */}
        <div className={`${activeId ? "flex" : "hidden sm:flex"} flex-1 flex-col min-w-0`}>
          {activeConv ? (
            <>
              {/* Mobile back button */}
              <div className="flex items-center gap-2 px-3 py-2 border-b sm:hidden">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActive(null)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium truncate">
                  {getConversationDisplayName(activeConv, currentUserId)}
                </span>
              </div>
              <MessageThread
                conversationId={activeConv.conversationId}
                currentUserId={currentUserId}
                participantCount={activeConv.participants.length}
              />
            </>
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
