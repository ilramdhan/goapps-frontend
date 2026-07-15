"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useCreateConversation } from "@/hooks/iam/use-chat"
import { useChatStore } from "@/stores/chat-store"
import { UserPicker } from "@/components/iam/user-picker"

interface NewConversationDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function NewConversationDialog({ open, onOpenChange }: NewConversationDialogProps) {
  const [peerUserId, setPeerUserId] = useState("")
  const { mutate, isPending } = useCreateConversation()
  const setActive = useChatStore((s) => s.setActiveConversation)

  useEffect(() => {
    if (!open) setPeerUserId("")
  }, [open])

  const handleCreate = () => {
    if (!peerUserId) return
    mutate(
      { peerUserId },
      {
        onSuccess: (conversation) => {
          if (conversation?.conversationId) setActive(conversation.conversationId)
          onOpenChange(false)
          setPeerUserId("")
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <UserPicker
            value={peerUserId}
            onChange={(id) => setPeerUserId(id)}
            placeholder="Search by name or email..."
            showOnlineStatus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isPending || !peerUserId}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start Chat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
