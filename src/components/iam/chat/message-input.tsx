"use client"

import { useCallback, useRef, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"

const TYPING_DEBOUNCE_MS = 2000

interface MessageInputProps {
  onSend: (body: string) => void
  onTyping: (isTyping: boolean) => void
  disabled?: boolean
}

export function MessageInput({ onSend, onTyping, disabled }: MessageInputProps) {
  const [value, setValue] = useState("")
  const isTypingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed) return
    if (timerRef.current) clearTimeout(timerRef.current)
    isTypingRef.current = false
    onTyping(false)
    setValue("")
    onSend(trimmed)
  }, [value, onSend, onTyping])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  return (
    <div className="flex items-end gap-2 p-3 border-t">
      <Textarea
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
        className="min-h-[40px] max-h-[120px] resize-none text-sm"
        disabled={disabled}
        rows={1}
      />
      <Button
        size="icon"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="shrink-0 h-10 w-10"
        aria-label="Send message"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  )
}
