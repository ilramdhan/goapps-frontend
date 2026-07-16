"use client"

import { useRef, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"

interface ChatbotInputProps {
    onSend: (message: string) => void
    disabled?: boolean
}

export function ChatbotInput({ onSend, disabled }: ChatbotInputProps) {
    const [value, setValue] = useState("")
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const handleSend = () => {
        const trimmed = value.trim()
        if (!trimmed || disabled) return
        setValue("")
        onSend(trimmed)
        setTimeout(() => textareaRef.current?.focus(), 50)
    }

    return (
        <div className="flex items-end gap-2 p-3 border-t shrink-0">
            <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                    }
                }}
                placeholder="Tanya apa saja tentang costing..."
                className="min-h-[36px] max-h-[96px] resize-none text-sm"
                disabled={disabled}
                rows={1}
            />
            <Button
                size="icon"
                onClick={handleSend}
                disabled={disabled || !value.trim()}
                className="h-9 w-9 shrink-0"
                aria-label="Send message"
            >
                <Send className="h-4 w-4" />
            </Button>
        </div>
    )
}
