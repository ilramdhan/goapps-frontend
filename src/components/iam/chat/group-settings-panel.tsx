"use client"

import { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, X, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { UserAvatar } from "@/components/common/user-avatar"
import { UserName } from "@/components/common/user-name"
import { UserPicker, type UserOption } from "@/components/iam/user-picker"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { usePresenceStore } from "@/stores/presence-store"
import { useChatStore } from "@/stores/chat-store"
import {
  useAddParticipants,
  useRemoveParticipant,
  useUpdateGroup,
  useLeaveConversation,
} from "@/hooks/iam/use-chat"
import { Conversation, Participant } from "@/types/iam/chat"

interface GroupSettingsPanelProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  conversation: Conversation
  currentUserId: string
  onLeft?: () => void
}

const ROLE_BADGE_VARIANT: Record<Participant["role"], "default" | "secondary" | "outline"> = {
  OWNER: "default",
  ADMIN: "secondary",
  MEMBER: "outline",
}

export function GroupSettingsPanel({
  open,
  onOpenChange,
  conversation,
  currentUserId,
  onLeft,
}: GroupSettingsPanelProps) {
  const isOnline = usePresenceStore((s) => s.isOnline)
  const setActive = useChatStore((s) => s.setActiveConversation)

  const [name, setName] = useState(conversation.name)
  const [addingMember, setAddingMember] = useState(false)
  const [pickerValue, setPickerValue] = useState("")
  const [removeTarget, setRemoveTarget] = useState<Participant | null>(null)
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false)

  // Reset the editable name when the panel switches to a different conversation
  // — adjust state during render (React's recommended pattern) rather than in an
  // effect, so no cascading re-render is triggered.
  const [nameConvId, setNameConvId] = useState(conversation.conversationId)
  if (nameConvId !== conversation.conversationId) {
    setNameConvId(conversation.conversationId)
    setName(conversation.name)
  }

  const addParticipants = useAddParticipants(conversation.conversationId)
  const removeParticipant = useRemoveParticipant(conversation.conversationId)
  const updateGroup = useUpdateGroup(conversation.conversationId)
  const leaveConversation = useLeaveConversation()

  const currentParticipant = conversation.participants.find((p) => p.userId === currentUserId)
  const canManage = currentParticipant?.role === "OWNER" || currentParticipant?.role === "ADMIN"

  const nameChanged = name.trim().length > 0 && name.trim() !== conversation.name

  const handleSaveName = () => {
    if (!nameChanged) return
    updateGroup.mutate(
      { name: name.trim() },
      {
        onSuccess: () => toast.success("Group name updated"),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update group"),
      }
    )
  }

  const handleAddMember = (id: string, user: UserOption | null) => {
    if (!id || !user) return
    addParticipants.mutate([id], {
      onSuccess: () => {
        toast.success(`${user.fullName || user.username} added`)
        setPickerValue("")
        setAddingMember(false)
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to add member"),
    })
  }

  const handleRemoveConfirm = () => {
    if (!removeTarget) return
    removeParticipant.mutate(removeTarget.userId, {
      onSuccess: () => {
        toast.success(`${removeTarget.fullName || removeTarget.username} removed`)
        setRemoveTarget(null)
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to remove member")
        setRemoveTarget(null)
      },
    })
  }

  const handleLeave = () => {
    leaveConversation.mutate(conversation.conversationId, {
      onSuccess: () => {
        toast.success("Left group")
        setConfirmLeaveOpen(false)
        onOpenChange(false)
        setActive(null)
        onLeft?.()
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to leave group")
        setConfirmLeaveOpen(false)
      },
    })
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex flex-col p-0 w-full sm:max-w-md gap-0" showCloseButton={false}>
          <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-background px-6 py-4">
            <div className="min-w-0">
              <SheetTitle className="text-base font-semibold leading-tight">Group settings</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                {conversation.participants.length} member{conversation.participants.length === 1 ? "" : "s"}
              </SheetDescription>
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </SheetClose>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Group name */}
            <div className="space-y-1.5">
              <Label htmlFor="group-settings-name">Group name</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="group-settings-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canManage}
                />
                {canManage && (
                  <Button
                    size="sm"
                    disabled={!nameChanged || updateGroup.isPending}
                    onClick={handleSaveName}
                  >
                    {updateGroup.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Save
                  </Button>
                )}
              </div>
            </div>

            {/* Members */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Members</Label>
                {canManage && !addingMember && (
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => setAddingMember(true)}>
                    <UserPlus className="h-3.5 w-3.5" /> Add member
                  </Button>
                )}
              </div>

              {addingMember && (
                <div className="flex items-center gap-2">
                  <UserPicker
                    value={pickerValue}
                    onChange={handleAddMember}
                    placeholder="Search users to add..."
                    showOnlineStatus
                    disabled={addParticipants.isPending}
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setAddingMember(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="space-y-1">
                {conversation.participants.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-accent"
                  >
                    <div className="relative shrink-0">
                      <UserAvatar userId={member.userId} colorHash className="h-8 w-8" fallbackClassName="text-xs" />
                      {isOnline(member.userId) && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <UserName userId={member.userId} compact className="text-sm font-medium truncate block" />
                    </div>
                    <Badge variant={ROLE_BADGE_VARIANT[member.role]} className="shrink-0 text-[10px]">
                      {member.role}
                    </Badge>
                    {canManage && member.role !== "OWNER" && member.userId !== currentUserId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => setRemoveTarget(member)}
                        aria-label={`Remove ${member.fullName || member.username}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <SheetFooter className="border-t">
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setConfirmLeaveOpen(true)}
              disabled={leaveConversation.isPending}
            >
              {leaveConversation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Leave Group
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(v) => !v && setRemoveTarget(null)}
        title="Remove member"
        description={`Remove ${removeTarget?.fullName || removeTarget?.username || "this member"} from the group?`}
        confirmText="Remove"
        variant="destructive"
        isLoading={removeParticipant.isPending}
        onConfirm={handleRemoveConfirm}
      />

      <ConfirmDialog
        open={confirmLeaveOpen}
        onOpenChange={setConfirmLeaveOpen}
        title="Leave group"
        description="You will no longer receive messages from this group. This cannot be undone."
        confirmText="Leave"
        variant="destructive"
        isLoading={leaveConversation.isPending}
        onConfirm={handleLeave}
      />
    </>
  )
}
