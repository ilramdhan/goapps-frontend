import { Search, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ChatbotToolBadgeProps {
    toolName: string
    hasError?: boolean
}

export function ChatbotToolBadge({ toolName, hasError }: ChatbotToolBadgeProps) {
    return (
        <Badge variant={hasError ? "destructive" : "secondary"} className="text-xs gap-1 font-normal">
            {hasError ? <AlertCircle className="h-3 w-3" /> : <Search className="h-3 w-3" />}
            {toolName.replace(/_/g, " ")}
        </Badge>
    )
}
