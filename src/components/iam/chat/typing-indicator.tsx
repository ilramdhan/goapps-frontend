import type { ReactNode } from "react"
import { UserName } from "@/components/common/user-name"

interface TypingUser {
  id: string
  name: string
}

interface TypingIndicatorProps {
  users: TypingUser[]
}

// Renders the user's name if the SSE event carried one; otherwise resolves it
// via the id (backend sometimes sends an empty callerName — see chat-store).
function TypingUserLabel({ user }: { user: TypingUser }) {
  if (user.name) return <>{user.name}</>
  return <UserName userId={user.id} compact />
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  let label: ReactNode
  if (users.length === 1) {
    label = (
      <>
        <TypingUserLabel user={users[0]} /> is typing...
      </>
    )
  } else if (users.length === 2) {
    label = (
      <>
        <TypingUserLabel user={users[0]} />, <TypingUserLabel user={users[1]} /> are typing...
      </>
    )
  } else {
    label = `${users.length} people are typing...`
  }

  return (
    <div className="px-4 py-1 text-xs text-muted-foreground flex items-center gap-1">
      <span className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
      {label}
    </div>
  )
}
