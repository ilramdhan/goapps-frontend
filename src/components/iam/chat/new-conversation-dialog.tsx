"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useCreateConversation } from "@/hooks/iam/use-chat"
import { useChatStore } from "@/stores/chat-store"

interface NewConversationDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
}

// NOTE: Backend expects a userId (UUID) for peerUserId — resolving an email/
// username to a userId via a lookup endpoint is a follow-up enhancement
// (tracked alongside the platform-wide "no raw UUID input" rule). For now this
// dialog accepts a user ID directly, matching Plan 05's documented scope.
export function NewConversationDialog({ open, onOpenChange }: NewConversationDialogProps) {
  const [peerUserId, setPeerUserId] = useState("")
  const { mutate, isPending } = useCreateConversation()
  const setActive = useChatStore((s) => s.setActiveConversation)

  const handleCreate = () => {
    const trimmed = peerUserId.trim()
    if (!trimmed) return
    mutate(
      { peerUserId: trimmed },
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="User ID"
            value={peerUserId}
            onChange={(e) => setPeerUserId(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isPending || !peerUserId.trim()}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start Chat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
