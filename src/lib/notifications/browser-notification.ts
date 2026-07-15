export function requestNotificationPermission(): void {
  if (typeof window === "undefined" || !("Notification" in window)) return
  if (Notification.permission === "default") {
    void Notification.requestPermission()
  }
}

export function showChatNotification(
  senderName: string,
  body: string,
  conversationId: string,
): void {
  if (typeof window === "undefined" || !("Notification" in window)) return
  if (Notification.permission !== "granted") return
  if (!document.hidden) return

  const truncated = body.length > 80 ? body.slice(0, 80) + "..." : body
  const notification = new Notification(senderName, {
    body: truncated,
    icon: "/icon-192x192.png",
    tag: `chat-${conversationId}`,
  })
  notification.onclick = () => {
    window.focus()
    window.location.href = "/chat"
    notification.close()
  }
}
