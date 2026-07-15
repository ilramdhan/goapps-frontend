"use client"

import { cn } from "@/lib/utils"
import { ChatMessage } from "@/types/iam/chat"
import { Check, CheckCheck } from "lucide-react"
import { format } from "date-fns"

interface ReadReceiptIconProps {
  receipts: { userId: string }[]
  participantCount: number
  isSender: boolean
}

function ReadReceiptIcon({ receipts, participantCount, isSender }: ReadReceiptIconProps) {
  if (!isSender) return null
  const readByAll = receipts.length >= participantCount - 1
  const delivered = receipts.length > 0
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

  return (
    <div className={cn("flex gap-2 max-w-[75%]", isSender ? "ml-auto flex-row-reverse" : "mr-auto")}>
      <div
        className={cn(
          "rounded-2xl px-3 py-2 text-sm",
          isSender ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"
        )}
      >
        {!isSender && <p className="text-xs font-semibold mb-0.5 opacity-70">{senderName}</p>}
        {message.isDeleted ? (
          <span className="italic opacity-60">[deleted]</span>
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
          />
        </div>
      </div>
    </div>
  )
}
