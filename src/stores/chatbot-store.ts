"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

// uuid package isn't a dependency here — crypto.randomUUID() is available in
// both the browser and Node 18+ runtimes this app targets.
function generateId(): string {
    return crypto.randomUUID()
}

export interface ChatbotToolCallResult {
    name: string
    data?: unknown
    error?: string
}

export interface ChatbotMessage {
    id: string
    role: "user" | "assistant"
    content: string
    isStreaming?: boolean
    toolCalls?: ChatbotToolCallResult[]
    createdAt: string
}

interface ChatbotState {
    sessionId: string
    messages: ChatbotMessage[]
    isOpen: boolean
    isLoading: boolean

    appendMessage: (msg: Omit<ChatbotMessage, "id" | "createdAt">) => string
    updateStreamingMessage: (id: string, contentDelta: string) => void
    finalizeStreamingMessage: (id: string) => void
    appendToolCall: (assistantId: string, call: ChatbotToolCallResult) => void
    resetSession: () => void
    setOpen: (open: boolean) => void
    setLoading: (loading: boolean) => void
}

export const useChatbotStore = create<ChatbotState>()(
    persist(
        (set) => ({
            sessionId: generateId(),
            messages: [],
            isOpen: false,
            isLoading: false,

            appendMessage: (msg) => {
                const id = generateId()
                set((s) => ({
                    messages: [...s.messages, { ...msg, id, createdAt: new Date().toISOString() }],
                }))
                return id
            },

            updateStreamingMessage: (id, delta) =>
                set((s) => ({
                    messages: s.messages.map((m) =>
                        m.id === id ? { ...m, content: m.content + delta, isStreaming: true } : m
                    ),
                })),

            finalizeStreamingMessage: (id) =>
                set((s) => ({
                    messages: s.messages.map((m) => (m.id === id ? { ...m, isStreaming: false } : m)),
                })),

            appendToolCall: (assistantId, call) =>
                set((s) => ({
                    messages: s.messages.map((m) =>
                        m.id === assistantId ? { ...m, toolCalls: [...(m.toolCalls ?? []), call] } : m
                    ),
                })),

            resetSession: () => set({ messages: [], sessionId: generateId(), isLoading: false }),

            setOpen: (open) => set({ isOpen: open }),
            setLoading: (loading) => set({ isLoading: loading }),
        }),
        {
            name: "chatbot-session",
            // Only persist sessionId + last 50 messages — prevents localStorage bloat.
            partialize: (s) => ({
                sessionId: s.sessionId,
                messages: s.messages.slice(-50),
            }),
        }
    )
)
