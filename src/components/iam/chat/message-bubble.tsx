"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { ChatMessage } from "@/types/iam/chat"
import { Check, CheckCheck, MoreHorizontal, Pencil, Trash2, History } from "lucide-react"
import { format } from "date-fns"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDialog } from "@/components/shared/confirm-dialog/confirm-dialog"
import { EditHistoryDialog } from "./edit-history-dialog"
import { useEditMessage, useDeleteMessage } from "@/hooks/iam/use-chat"

interface ReadReceiptIconProps {
  receipts: { userId: string }[]
  participantCount: number
  isSender: boolean
  senderUserId: string
}

function ReadReceiptIcon({ receipts, participantCount, isSender, senderUserId }: ReadReceiptIconProps) {
  if (!isSender) return null
  const othersRead = receipts.filter((r) => r.userId !== senderUserId)
  const readByAll = othersRead.length >= participantCount - 1
  const delivered = othersRead.length > 0
  if (readByAll) return <CheckCheck className="h-3 w-3 text-blue-500 shrink-0" />
  if (delivered) return <CheckCheck className="h-3 w-3 text-muted-foreground shrink-0" />
  return <Check className="h-3 w-3 text-muted-foreground shrink-0" />
}

interface MessageBubbleProps {
  message: ChatMessage
  isSender: boolean
  participantCount: number
  senderName: string
}

export function MessageBubble({ message, isSender, participantCount, senderName }: MessageBubbleProps) {
  const time = message.createdAt ? format(new Date(message.createdAt), "HH:mm") : ""

  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(message.body)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const editMessage = useEditMessage(message.conversationId, message.messageId)
  const deleteMessage = useDeleteMessage(message.conversationId, message.messageId)

  useEffect(() => {
    if (isEditing) textareaRef.current?.focus()
  }, [isEditing])

  const startEdit = () => {
    setEditValue(message.body)
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setEditValue(message.body)
  }

  const saveEdit = () => {
    const trimmed = editValue.trim()
    if (!trimmed || trimmed === message.body) {
      setIsEditing(false)
      return
    }
    editMessage.mutate(
      { body: trimmed },
      {
        onSuccess: () => setIsEditing(false),
      }
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      saveEdit()
    } else if (e.key === "Escape") {
      e.preventDefault()
      cancelEdit()
    }
  }

  const showMenu = !message.isDeleted && (isSender || message.isEdited)

  return (
    <div className={cn("group flex gap-2 max-w-[75%]", isSender ? "ml-auto flex-row-reverse" : "mr-auto")}>
      <div
        className={cn(
          "rounded-2xl px-3 py-2 text-sm min-w-0",
          isSender ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"
        )}
      >
        {!isSender && <p className="text-xs font-semibold mb-0.5 opacity-70">{senderName}</p>}
        {message.isDeleted ? (
          <span className="italic opacity-60">[deleted]</span>
        ) : isEditing ? (
          <div className="space-y-1">
            <Textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={editMessage.isPending}
              className="min-h-[40px] max-h-[160px] resize-none text-sm bg-background text-foreground"
              rows={1}
            />
            <p className="text-[10px] opacity-70">Enter to save, Escape to cancel</p>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words">{message.body}</p>
        )}
        <div className={cn("flex items-center gap-1 mt-0.5", isSender ? "justify-end" : "justify-start")}>
          {message.isEdited && !message.isDeleted && <span className="text-[10px] opacity-60">edited</span>}
          <span className="text-[10px] opacity-60">{time}</span>
          <ReadReceiptIcon
            receipts={message.readReceipts}
            participantCount={participantCount}
            isSender={isSender}
            senderUserId={message.senderUserId}
          />
        </div>
      </div>

      {showMenu && !isEditing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 self-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              aria-label="Message actions"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isSender ? "end" : "start"}>
            {isSender && (
              <DropdownMenuItem onClick={startEdit}>
                <Pencil className="h-4 w-4" /> Edit
              </DropdownMenuItem>
            )}
            {message.isEdited && (
              <DropdownMenuItem onClick={() => setHistoryOpen(true)}>
                <History className="h-4 w-4" /> View edit history
              </DropdownMenuItem>
            )}
            {isSender && (
              <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete message"
        description="This message will be permanently deleted for everyone in this conversation."
        variant="destructive"
        confirmText="Delete"
        isLoading={deleteMessage.isPending}
        onConfirm={async () => {
          await deleteMessage.mutateAsync()
          setDeleteOpen(false)
        }}
      />

      <EditHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        conversationId={message.conversationId}
        messageId={message.messageId}
      />
    </div>
  )
}
