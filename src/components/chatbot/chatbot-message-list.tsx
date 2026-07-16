"use client"

import { useEffect, useRef } from "react"
import { useChatbotStore } from "@/stores/chatbot-store"
import { ChatbotMessage } from "./chatbot-message"

export function ChatbotMessageList() {
    const messages = useChatbotStore((s) => s.messages)
    const bottomRef = useRef<HTMLDivElement>(null)
    const lastMessage = messages[messages.length - 1]

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
        // Re-scroll on new messages and on streaming content growth.
    }, [messages.length, lastMessage?.content])

    if (messages.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center p-4 text-center">
                <div className="text-muted-foreground text-sm">
                    <p className="font-medium mb-1">GoApps AI Assistant</p>
                    <p>Tanya tentang CPR, produk, formula, atau status approval.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
                <ChatbotMessage key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
        </div>
    )
}
