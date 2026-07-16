"use client"

import { useCallback, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { useCreateConversation } from "@/hooks/iam/use-chat"
import { useChatStore } from "@/stores/chat-store"
import { UserPicker, type UserOption } from "@/components/iam/user-picker"

interface NewConversationDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
}

interface SelectedUser {
  id: string
  name: string
}

export function NewConversationDialog({ open, onOpenChange }: NewConversationDialogProps) {
  const [tab, setTab] = useState<"direct" | "group">("direct")

  // Direct message tab state
  const [peerUserId, setPeerUserId] = useState("")

  // Group tab state
  const [groupName, setGroupName] = useState("")
  const [pickerValue, setPickerValue] = useState("")
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([])

  const { mutate, isPending } = useCreateConversation()
  const setActive = useChatStore((s) => s.setActiveConversation)

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setTab("direct")
        setPeerUserId("")
        setGroupName("")
        setPickerValue("")
        setSelectedUsers([])
      }
      onOpenChange(next)
    },
    [onOpenChange]
  )

  const handleCreateDirect = () => {
    if (!peerUserId) return
    mutate(
      { peerUserId },
      {
        onSuccess: (conversation) => {
          if (conversation?.conversationId) {
            setActive(conversation.conversationId)
          } else {
            toast.error("Failed to create conversation — no response from server")
          }
          handleOpenChange(false)
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to create conversation")
        },
      }
    )
  }

  const handlePickGroupMember = (id: string, user: UserOption | null) => {
    if (!id || !user) return
    setSelectedUsers((prev) => {
      if (prev.some((u) => u.id === id)) return prev
      return [...prev, { id, name: user.fullName || user.username || user.email }]
    })
    setPickerValue("")
  }

  const handleRemoveGroupMember = (id: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== id))
  }

  const canCreateGroup = groupName.trim().length > 0 && selectedUsers.length > 0

  const handleCreateGroup = () => {
    if (!canCreateGroup) return
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
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "direct" | "group")}>
          <TabsList className="w-full">
            <TabsTrigger value="direct">Direct Message</TabsTrigger>
            <TabsTrigger value="group">New Group</TabsTrigger>
          </TabsList>

          <TabsContent value="direct" className="space-y-4 pt-2">
            <UserPicker
              value={peerUserId}
              onChange={(id) => setPeerUserId(id)}
              placeholder="Search by name or email..."
              showOnlineStatus
            />
          </TabsContent>

          <TabsContent value="group" className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-conv-group-name">
                Group name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="new-conv-group-name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g., Finance Team"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Add members</Label>
              <UserPicker
                value={pickerValue}
                onChange={handlePickGroupMember}
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
                      onClick={() => handleRemoveGroupMember(u.id)}
                      aria-label={`Remove ${u.name}`}
                      className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          {tab === "direct" ? (
            <Button onClick={handleCreateDirect} disabled={isPending || !peerUserId}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start Chat
            </Button>
          ) : (
            <Button onClick={handleCreateGroup} disabled={isPending || !canCreateGroup}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Group
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
