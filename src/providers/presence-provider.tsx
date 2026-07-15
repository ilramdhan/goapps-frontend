"use client"

// PresenceProvider sends a heartbeat every 30s so the backend can mark the
// current user online, and listens for "presence"-typed frames on the shared
// "chat" SSE channel (window.__sharedEventSource) to keep presence-store in
// sync with other users' online/offline transitions.
//
// See chat-provider.tsx for why we poll for window.__sharedEventSource
// instead of reading it once: notification-provider.tsx assigns it inside its
// own effect, which (due to React's bottom-up effect ordering) can run after
// this provider's effect on first mount.

import { useEffect, useRef } from "react"
import { usePresenceStore } from "@/stores/presence-store"
import { ChatSSEEvent } from "@/types/iam/chat"

const HEARTBEAT_INTERVAL_MS = 30_000
const POLL_INTERVAL_MS = 200

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const setOnline = usePresenceStore((s) => s.setOnline)
  const setOffline = usePresenceStore((s) => s.setOffline)
  const attachedRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const sendHeartbeat = () => {
      void fetch("/api/v1/iam/presence/heartbeat", { method: "POST", credentials: "include" })
    }
    sendHeartbeat() // immediate on mount
    const heartbeatId = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)

    const handler = (e: MessageEvent) => {
      try {
        const evt = JSON.parse(e.data) as ChatSSEEvent
        if (evt.type !== "presence" || !evt.userId) return
        if (evt.isOnline) setOnline(evt.userId)
        else setOffline(evt.userId)
      } catch {
        // ignore malformed events
      }
    }

    const tryAttach = () => {
      const es = window.__sharedEventSource
      if (es && attachedRef.current !== es) {
        if (attachedRef.current) attachedRef.current.removeEventListener("chat", handler as EventListener)
        es.addEventListener("chat", handler as EventListener)
        attachedRef.current = es
      } else if (!es && attachedRef.current) {
        attachedRef.current = null
      }
    }

    tryAttach()
    const pollId = setInterval(tryAttach, POLL_INTERVAL_MS)

    return () => {
      clearInterval(heartbeatId)
      clearInterval(pollId)
      if (attachedRef.current) attachedRef.current.removeEventListener("chat", handler as EventListener)
      attachedRef.current = null
    }
  }, [setOnline, setOffline])

  return <>{children}</>
}
