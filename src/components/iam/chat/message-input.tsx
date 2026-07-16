"use client"

import { useCallback, useRef, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Send, Paperclip, X, Loader2, FileText } from "lucide-react"
import { toast } from "sonner"
import { useUploadAttachment } from "@/hooks/iam/use-chat"
import { Attachment } from "@/types/iam/chat"
import { cn } from "@/lib/utils"

const TYPING_DEBOUNCE_MS = 2000
const MAX_ATTACHMENTS = 5
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

interface MessageInputProps {
  conversationId: string
  onSend: (body: string, attachmentIds: string[]) => void
  onTyping: (isTyping: boolean) => void
  disabled?: boolean
}

export function MessageInput({ conversationId, onSend, onTyping, disabled }: MessageInputProps) {
  const [value, setValue] = useState("")
  const [pending, setPending] = useState<Attachment[]>([])
  const isTypingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadAttachment = useUploadAttachment(conversationId)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value)
      if (!isTypingRef.current) {
        isTypingRef.current = true
        onTyping(true)
      }
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        isTypingRef.current = false
        onTyping(false)
      }, TYPING_DEBOUNCE_MS)
    },
    [onTyping]
  )

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      const remaining = MAX_ATTACHMENTS - pending.length
      if (remaining <= 0) {
        toast.error(`Maximum ${MAX_ATTACHMENTS} attachments per message`)
        return
      }
      const selected = Array.from(files).slice(0, remaining)
      for (const file of selected) {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`"${file.name}" exceeds the 25MB limit`)
          continue
        }
        try {
          const att = await uploadAttachment.mutateAsync(file)
          setPending((prev) => [...prev, att])
        } catch (err) {
          toast.error(err instanceof Error ? err.message : `Failed to upload "${file.name}"`)
        }
      }
    },
    [pending.length, uploadAttachment]
  )

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      void handleFiles(e.target.files)
      e.target.value = "" // allow re-selecting the same file
    },
    [handleFiles]
  )

  const removePending = useCallback((id: string) => {
    setPending((prev) => prev.filter((a) => a.attachmentId !== id))
  }, [])

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed && pending.length === 0) return
    if (timerRef.current) clearTimeout(timerRef.current)
    isTypingRef.current = false
    onTyping(false)
    setValue("")
    const ids = pending.map((a) => a.attachmentId)
    setPending([])
    onSend(trimmed, ids)
  }, [value, pending, onSend, onTyping])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const canSend = !disabled && (!!value.trim() || pending.length > 0) && !uploadAttachment.isPending

  return (
    <div className="border-t">
      {(pending.length > 0 || uploadAttachment.isPending) && (
        <div className="flex flex-wrap gap-2 px-3 pt-3">
          {pending.map((a) => (
            <div
              key={a.attachmentId}
              className="flex items-center gap-1.5 rounded-md border bg-muted/50 py-1 pl-2 pr-1 text-xs"
            >
              {a.contentType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.thumbnailUrl || a.fileUrl}
                  alt={a.fileName}
                  className="h-6 w-6 rounded object-cover"
                />
              ) : (
                <FileText className="h-4 w-4 opacity-70" />
              )}
              <span className="max-w-[120px] truncate">{a.fileName}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => removePending(a.attachmentId)}
                aria-label={`Remove ${a.fileName}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {uploadAttachment.isPending && (
            <div className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
            </div>
          )}
        </div>
      )}
      <div className="flex items-end gap-2 p-3">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onFileInputChange}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || pending.length >= MAX_ATTACHMENTS}
          className="shrink-0 h-10 w-10"
          aria-label="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Textarea
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
          className={cn("min-h-[40px] max-h-[120px] resize-none text-sm")}
          disabled={disabled}
          rows={1}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!canSend}
          className="shrink-0 h-10 w-10"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
