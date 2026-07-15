interface TypingIndicatorProps {
  userIds: string[]
}

export function TypingIndicator({ userIds }: TypingIndicatorProps) {
  const label = userIds.length === 1 ? "Someone is typing..." : `${userIds.length} people are typing...`
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
