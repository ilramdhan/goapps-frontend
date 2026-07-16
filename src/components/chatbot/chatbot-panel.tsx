"use client"

import { useChatbotStore } from "@/stores/chatbot-store"
import { cn } from "@/lib/utils"
import { ChatbotHeader } from "./chatbot-header"
import { ChatbotMessageList } from "./chatbot-message-list"
import { ChatbotInput } from "./chatbot-input"

interface ChatbotStreamEvent {
    type: "delta" | "tool_call" | "tool_result" | "blocked" | "error" | "done"
    content?: string
    name?: string
    data?: unknown
    error?: string
    reason?: string
}

export function ChatbotPanel() {
    const isOpen = useChatbotStore((s) => s.isOpen)
    const isLoading = useChatbotStore((s) => s.isLoading)

    if (!isOpen) return null

    const handleSend = async (userMessage: string) => {
        const store = useChatbotStore.getState()
        const { sessionId, appendMessage, updateStreamingMessage, finalizeStreamingMessage, appendToolCall, setLoading } =
            store

        // Snapshot history before appending the new user message.
        const history = store.messages.slice(-20).map((m) => ({ role: m.role, content: m.content }))

        appendMessage({ role: "user", content: userMessage })
        const assistantId = appendMessage({ role: "assistant", content: "", isStreaming: true })
        setLoading(true)

        try {
            const res = await fetch("/api/v1/chatbot/message", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-chatbot-session-id": sessionId,
                },
                body: JSON.stringify({ message: userMessage, history }),
            })

            if (!res.ok || !res.body) {
                throw new Error(`Request failed with status ${res.status}`)
            }

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ""

            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })

                const lines = buffer.split("\n")
                // Keep the last (possibly incomplete) line in the buffer.
                buffer = lines.pop() ?? ""

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue
                    const data = line.slice(6).trim()
                    if (data === "[DONE]") continue
                    try {
                        const evt = JSON.parse(data) as ChatbotStreamEvent
                        if (evt.type === "delta" && evt.content) {
                            updateStreamingMessage(assistantId, evt.content)
                        } else if (evt.type === "tool_call") {
                            appendToolCall(assistantId, { name: evt.name ?? "" })
                        } else if (evt.type === "tool_result") {
                            appendToolCall(assistantId, { name: evt.name ?? "", data: evt.data, error: evt.error })
                        } else if (evt.type === "blocked") {
                            updateStreamingMessage(assistantId, `Maaf, permintaan ini tidak dapat diproses: ${evt.reason ?? ""}`)
                        } else if (evt.type === "error") {
                            updateStreamingMessage(assistantId, `Terjadi kesalahan: ${evt.error ?? "unknown"}`)
                        }
                    } catch {
                        // skip malformed SSE frame
                    }
                }
            }
        } catch (err) {
            updateStreamingMessage(assistantId, `Error: ${err instanceof Error ? err.message : "Unknown error"}`)
        } finally {
            finalizeStreamingMessage(assistantId)
            setLoading(false)
        }
    }

    return (
        <div
            className={cn(
                "fixed bottom-24 right-6 z-50",
                "w-[380px] h-[520px]",
                "bg-background border rounded-2xl shadow-2xl",
                "flex flex-col overflow-hidden"
            )}
        >
            <ChatbotHeader />
            <ChatbotMessageList />
            <ChatbotInput onSend={handleSend} disabled={isLoading} />
        </div>
    )
}
