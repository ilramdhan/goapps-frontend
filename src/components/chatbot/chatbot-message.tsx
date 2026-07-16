"use client"

import type { ChatbotMessage as ChatbotMessageType } from "@/stores/chatbot-store"
import { cn } from "@/lib/utils"
import { ChatbotToolBadge } from "./chatbot-tool-badge"

interface ChatbotMessageProps {
    message: ChatbotMessageType
}

export function ChatbotMessage({ message }: ChatbotMessageProps) {
    const isUser = message.role === "user"

    return (
        <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
            {/* Tool call badges — only ever attached to assistant messages */}
            {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {message.toolCalls.map((call, i) => (
                        <ChatbotToolBadge key={`${call.name}-${i}`} toolName={call.name} hasError={!!call.error} />
                    ))}
                </div>
            )}
            <div
                className={cn(
                    "rounded-2xl px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap break-words",
                    isUser ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"
                )}
            >
                {message.content || (message.isStreaming ? "..." : "")}
                {message.isStreaming && (
                    <span className="inline-block w-2 h-4 bg-current animate-pulse ml-0.5 align-middle" />
                )}
            </div>
        </div>
    )
}
