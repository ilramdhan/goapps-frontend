"use client"

import { Bot, RefreshCw, X } from "lucide-react"
import { useChatbotStore } from "@/stores/chatbot-store"
import { Button } from "@/components/ui/button"

export function ChatbotHeader() {
    const resetSession = useChatbotStore((s) => s.resetSession)
    const setOpen = useChatbotStore((s) => s.setOpen)

    return (
        <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
            <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">GoApps Assistant</span>
            </div>
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={resetSession}
                    title="Reset session"
                    aria-label="Reset session"
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setOpen(false)}
                    aria-label="Close chatbot"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
