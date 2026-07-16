"use client"

import { useCallback, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { useCreateConversation } from "@/hooks/iam/use-chat"
import { useChatStore } from "@/stores/chat-store"
import { UserPicker, type UserOption } from "@/components/iam/user-picker"

interface SelectedUser {
  id: string
  name: string
}

interface NewGroupDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function NewGroupDialog({ open, onOpenChange }: NewGroupDialogProps) {
  const [groupName, setGroupName] = useState("")
  const [pickerValue, setPickerValue] = useState("")
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([])
  const { mutate, isPending } = useCreateConversation()
  const setActive = useChatStore((s) => s.setActiveConversation)

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setGroupName("")
        setPickerValue("")
        setSelectedUsers([])
      }
      onOpenChange(next)
    },
    [onOpenChange]
  )

  const handlePick = (id: string, user: UserOption | null) => {
    if (!id || !user) return
    setSelectedUsers((prev) => {
      if (prev.some((u) => u.id === id)) return prev
      return [...prev, { id, name: user.fullName || user.username || user.email }]
    })
    // Reset the picker so the user can search for the next person.
    setPickerValue("")
  }

  const handleRemove = (id: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== id))
  }

  const canCreate = groupName.trim().length > 0 && selectedUsers.length > 0

  const handleCreate = () => {
    if (!canCreate) return
    mutate(
      { name: groupName.trim(), participantIds: selectedUsers.map((u) => u.id) },
      {
        onSuccess: (conversation) => {
          if (conversation?.conversationId) {
            setActive(conversation.conversationId)
          } else {
            toast.error("Failed to create group — no response from server")
          }
          handleOpenChange(false)
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to create group")
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="group-name">
              Group name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Finance Team"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Add members</Label>
            <UserPicker
              value={pickerValue}
              onChange={handlePick}
              placeholder="Search users to add..."
              showOnlineStatus
            />
          </div>

          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((u) => (
                <Badge key={u.id} variant="secondary" className="gap-1 pr-1">
                  {u.name}
                  <button
                    type="button"
                    onClick={() => handleRemove(u.id)}
                    aria-label={`Remove ${u.name}`}
                    className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isPending || !canCreate}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
