"use client"

// NotificationProvider — opens a long-lived EventSource to /api/v1/iam/notifications/stream
// when the user is authenticated, and pushes incoming notifications into the
// TanStack Query cache so the bell + dropdown update without polling.
//
// EventSource handles automatic reconnect and Last-Event-ID resume natively.

import { createContext, useContext, useEffect, useRef, useSyncExternalStore } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useAuth } from "./auth-provider"
import { notificationKeys } from "@/hooks/iam/use-notifications"
import { useNotificationEventStore } from "@/stores/notification-event-store"
import {
  Notification,
  normalizeNotification,
  RawNotification,
  NotificationSeverity,
  typeLabel,
} from "@/types/iam/notification"

interface NotificationContextValue {
  // Status of the SSE connection.
  connected?: boolean
}

declare global {
  interface Window {
    // Shared EventSource for /api/v1/iam/notifications/stream — exposed so
    // chat-provider.tsx can attach its own `chat` event listener without
    // opening a second SSE connection.
    __sharedEventSource?: EventSource | null
  }
}

const NotificationContext = createContext<NotificationContextValue>({})

interface ProviderProps {
  children: React.ReactNode
}

interface RawStreamEvent {
  eventId?: string
  event_id?: string
  notification?: RawNotification | null
  isHeartbeat?: boolean
  is_heartbeat?: boolean
}

// connectionStore is a tiny external store that backs useNotificationConnection
// without violating React's "no setState during effect body" rule. The provider
// effect updates `connectedFlag` directly through setters that broadcast to
// any subscribed consumer via useSyncExternalStore.
const connectionStore = (() => {
  let connected = false
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((l) => l())
  return {
    set(v: boolean) {
      if (connected === v) return
      connected = v
      notify()
    },
    subscribe(l: () => void) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    getSnapshot: () => connected,
  }
})()

export function NotificationProvider({ children }: ProviderProps) {
  const { isAuthenticated } = useAuth()
  const qc = useQueryClient()
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      // Tear down any existing connection on logout.
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
      if (typeof window !== "undefined") window.__sharedEventSource = null
      connectionStore.set(false)
      return
    }

    // Open SSE.
    const es = new EventSource("/api/v1/iam/notifications/stream", { withCredentials: true })
    esRef.current = es
    // Expose the shared connection so chat-provider.tsx can attach a `chat`
    // event listener to the same stream instead of opening a second one.
    if (typeof window !== "undefined") window.__sharedEventSource = es
    es.onopen = () => connectionStore.set(true)

    const handleEvent = (raw: RawStreamEvent) => {
      const isHeartbeat = raw.isHeartbeat ?? raw.is_heartbeat ?? false
      if (isHeartbeat) return
      if (!raw.notification) return
      const n: Notification = normalizeNotification(raw.notification)

      // Fan-out to per-feature hooks (e.g. useCPRRealtimeSync) via Zustand store.
      useNotificationEventStore.getState().dispatch(n)

      // Refresh the unread count + lists.
      qc.invalidateQueries({ queryKey: notificationKeys.all })

      // Surface a transient toast — severity-driven.
      const title = `${typeLabel(n.type)}: ${n.title}`
      switch (n.severity) {
        case NotificationSeverity.NOTIFICATION_SEVERITY_SUCCESS:
          toast.success(title, { description: n.body })
          break
        case NotificationSeverity.NOTIFICATION_SEVERITY_WARNING:
          toast.warning(title, { description: n.body })
          break
        case NotificationSeverity.NOTIFICATION_SEVERITY_ERROR:
          toast.error(title, { description: n.body })
          break
        default:
          toast.message(title, { description: n.body })
      }
    }

    const onMessage = (ev: MessageEvent) => {
      try {
        const parsed = JSON.parse(ev.data) as RawStreamEvent
        handleEvent(parsed)
      } catch (err) {
        console.error("notification stream parse error", err)
      }
    }

    // Backend uses `event: notification`; some browsers also fire generic 'message'.
    es.addEventListener("notification", onMessage as EventListener)
    es.onmessage = onMessage

    es.onerror = () => {
      // EventSource auto-reconnects with exponential backoff; reflect dropped
      // state so consumers can show a "reconnecting" hint if they want.
      connectionStore.set(false)
    }

    return () => {
      es.removeEventListener("notification", onMessage as EventListener)
      es.close()
      if (esRef.current === es) esRef.current = null
      if (typeof window !== "undefined" && window.__sharedEventSource === es) {
        window.__sharedEventSource = null
      }
      connectionStore.set(false)
    }
  }, [isAuthenticated, qc])

  return <NotificationContext.Provider value={{}}>{children}</NotificationContext.Provider>
}

// useNotificationConnection returns the current SSE connection status. Reads
// from a small external store, avoiding the no-setState-in-effect rule.
export function useNotificationConnection(): NotificationContextValue {
  void useContext(NotificationContext) // keep provider dependency for future fields
  const connected = useSyncExternalStore(
    connectionStore.subscribe,
    connectionStore.getSnapshot,
    connectionStore.getSnapshot, // SSR-safe snapshot (always false on server)
  )
  return { connected }
}
