"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useEditHistory } from "@/hooks/iam/use-chat"
import { Loader2 } from "lucide-react"
import { format } from "date-fns"
import { UserName } from "@/components/common/user-name"

interface EditHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversationId: string
  messageId: string
}

export function EditHistoryDialog({ open, onOpenChange, conversationId, messageId }: EditHistoryDialogProps) {
  const { data, isLoading, isError } = useEditHistory(conversationId, messageId, open)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit history</DialogTitle>
          <DialogDescription>Previous versions of this message.</DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </div>
        )}

        {isError && <p className="text-sm text-destructive py-4">Failed to load edit history.</p>}

        {!isLoading && !isError && (data?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground py-4">No previous versions.</p>
        )}

        {!isLoading && !isError && (data?.length ?? 0) > 0 && (
          <div className="max-h-[60vh] overflow-y-auto space-y-3">
            {data!.map((entry) => (
              <div key={entry.historyId} className="rounded-md border p-3 space-y-1">
                <p className="text-sm whitespace-pre-wrap break-words">{entry.body}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>Edited by</span>
                  <UserName userId={entry.editedBy} compact />
                  <span>&middot;</span>
                  <span>{entry.editedAt ? format(new Date(entry.editedAt), "MMM d, yyyy HH:mm") : ""}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
