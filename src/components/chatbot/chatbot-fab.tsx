"use client"

import { Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useChatbotStore } from "@/stores/chatbot-store"

export function ChatbotFab() {
    const isOpen = useChatbotStore((s) => s.isOpen)
    const setOpen = useChatbotStore((s) => s.setOpen)

    return (
        <Button
            size="icon"
            variant={isOpen ? "default" : "secondary"}
            className="h-12 w-12 rounded-full shadow-lg"
            onClick={() => setOpen(!isOpen)}
            aria-label="AI Assistant"
        >
            <Bot className="h-5 w-5" />
        </Button>
    )
}
