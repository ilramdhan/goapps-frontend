// Streaming SSE bridge for the AI chatbot.
//   1. Extracts userId from the JWT access-token cookie (claims decoded
//      without signature verification — good enough for a UX-level RBAC
//      hint; every downstream BFF route still enforces real auth/permissions).
//   2. Runs guardrails (Layer 3 pattern filter + Layer 1/2 rate-limit stubs).
//   3. Builds system prompt + trimmed history + tool defs.
//   4. Streams the DeepSeek response back to the browser as SSE.
//   5. Executes tool calls, then makes a second DeepSeek call with the result.
//   6. Fires an async, non-blocking audit log request.

import { NextRequest } from "next/server"
import {
    streamDeepSeek,
    SYSTEM_PROMPT,
    type ChatMessage as DeepSeekMsg,
    type ToolCall,
} from "@/lib/chatbot/deepseek-client"
import { CHATBOT_TOOLS } from "@/lib/chatbot/tools"
import { executeTool } from "@/lib/chatbot/tool-executor"
import { checkGuardrails } from "@/lib/chatbot/guardrails"
import { AUTH_COOKIES } from "@/lib/auth/config"

export const runtime = "nodejs"
// Streaming responses must never be cached or statically optimized.
export const dynamic = "force-dynamic"

interface ChatbotRequestBody {
    message: string
    history?: Array<{ role: string; content: string }>
}

// Decodes the userId claim from a JWT payload without verifying the
// signature — this route only needs the user identity for scoping tool
// calls and audit logs; every downstream BFF request still carries the
// real cookie and is authorized independently.
function extractUserId(token: string): string {
    try {
        const payloadSegment = token.split(".")[1]
        if (!payloadSegment) return ""
        const payload = JSON.parse(Buffer.from(payloadSegment, "base64url").toString("utf-8")) as {
            user_id?: string
            sub?: string
        }
        return payload.user_id ?? payload.sub ?? ""
    } catch {
        return ""
    }
}

export async function POST(request: NextRequest) {
    const token = request.cookies.get(AUTH_COOKIES.ACCESS_TOKEN)?.value
    if (!token) {
        return new Response("Unauthorized", { status: 401 })
    }

    const userId = extractUserId(token)
    if (!userId) {
        return new Response("Unauthorized", { status: 401 })
    }

    let body: ChatbotRequestBody
    try {
        body = (await request.json()) as ChatbotRequestBody
    } catch {
        return new Response("Invalid JSON body", { status: 400 })
    }

    const { message, history = [] } = body
    if (!message || typeof message !== "string") {
        return new Response("message is required", { status: 400 })
    }

    const encoder = new TextEncoder()

    // Layer 3: prompt injection / jailbreak pattern filter.
    const guardrail = await checkGuardrails({ message, userId })
    if (guardrail.blocked) {
        const blockedStream = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: "blocked", reason: guardrail.reason })}\n\n`)
                )
                controller.enqueue(encoder.encode("data: [DONE]\n\n"))
                controller.close()
            },
        })
        return new Response(blockedStream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache, no-transform",
                Connection: "keep-alive",
            },
        })
    }

    const maxHistory = parseInt(process.env.CHATBOT_MAX_HISTORY_MESSAGES ?? "20", 10)
    const maxResponseTokens = parseInt(process.env.CHATBOT_MAX_RESPONSE_TOKENS ?? "2000", 10)

    // Layer 4: system prompt is always first and immutable.
    const messages: DeepSeekMsg[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.slice(-maxHistory).map((m) => ({ role: m.role as DeepSeekMsg["role"], content: m.content })),
        { role: "user", content: message },
    ]

    const toolsCalled: string[] = []
    const requestTokenEstimate = messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0)
    const sessionId = request.headers.get("x-chatbot-session-id") ?? "unknown"
    const cookieHeader = request.headers.get("cookie") ?? ""

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            let closed = false
            const enqueue = (data: unknown) => {
                if (closed) return
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
                } catch {
                    closed = true
                }
            }

            let responseTokens = 0

            try {
                let pendingToolCall: Partial<ToolCall> | null = null

                for await (const chunk of streamDeepSeek(messages, CHATBOT_TOOLS, maxResponseTokens)) {
                    if (chunk.type === "delta" && chunk.content) {
                        responseTokens += 1
                        enqueue({ type: "delta", content: chunk.content })
                    } else if (chunk.type === "tool_call" && chunk.toolCall) {
                        // Tool call arguments can arrive fragmented across chunks.
                        if (!pendingToolCall) {
                            pendingToolCall = { ...chunk.toolCall, function: { ...chunk.toolCall.function } }
                        } else {
                            if (chunk.toolCall.function?.name) {
                                pendingToolCall.function!.name = chunk.toolCall.function.name
                            }
                            if (chunk.toolCall.function?.arguments) {
                                pendingToolCall.function!.arguments =
                                    (pendingToolCall.function!.arguments ?? "") + chunk.toolCall.function.arguments
                            }
                        }
                    } else if (chunk.type === "done") {
                        if (pendingToolCall?.function?.name) {
                            const toolName = pendingToolCall.function.name
                            toolsCalled.push(toolName)
                            enqueue({ type: "tool_call", name: toolName })

                            let toolArgs: unknown = {}
                            try {
                                toolArgs = JSON.parse(pendingToolCall.function.arguments ?? "{}")
                            } catch {
                                // invalid JSON args — executeTool's Zod validation will reject it
                            }

                            const toolResult = await executeTool(toolName, toolArgs, userId)
                            enqueue({ type: "tool_result", name: toolName, data: toolResult.data, error: toolResult.error })

                            const messagesWithTool: DeepSeekMsg[] = [
                                ...messages,
                                { role: "assistant", content: "", tool_call_id: pendingToolCall.id },
                                {
                                    role: "tool",
                                    content: JSON.stringify(toolResult.data ?? { error: toolResult.error }),
                                    tool_call_id: pendingToolCall.id ?? "",
                                    name: toolName,
                                },
                            ]

                            for await (const chunk2 of streamDeepSeek(messagesWithTool, [], maxResponseTokens)) {
                                if (chunk2.type === "delta" && chunk2.content) {
                                    responseTokens += 1
                                    enqueue({ type: "delta", content: chunk2.content })
                                } else if (chunk2.type === "done" || chunk2.type === "error") {
                                    break
                                }
                            }
                        }

                        // Fire-and-forget audit log — never blocks or fails the response.
                        void fetch(new URL("/api/v1/chatbot/audit", request.url), {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Cookie: cookieHeader },
                            body: JSON.stringify({
                                sessionId,
                                requestTokens: requestTokenEstimate,
                                responseTokens,
                                toolsCalled,
                                wasBlocked: false,
                            }),
                        }).catch(() => {
                            // Audit logging is best-effort — swallow network errors.
                        })

                        enqueue({ type: "done" })
                        break
                    } else if (chunk.type === "error") {
                        enqueue({ type: "error", error: chunk.error })
                        break
                    }
                }
            } catch (err) {
                enqueue({ type: "error", error: err instanceof Error ? err.message : "Unknown error" })
            } finally {
                closed = true
                try {
                    controller.close()
                } catch {
                    // already closed
                }
            }
        },
    })

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    })
}
