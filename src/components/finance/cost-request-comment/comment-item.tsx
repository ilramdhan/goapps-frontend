"use client"

// CommentItem — one row in the thread. Supports view, edit (author only), hide/unhide
// (admin), delete, edit-history, and per-comment attachments. Plaintext body is the
// canonical display (S6 ships without a rich-text renderer).
import { useState } from "react"
import { Edit, EyeOff, History, Loader2, Save, Trash2, X } from "lucide-react"

import { ConfirmDialog } from "@/components/shared/confirm-dialog/confirm-dialog"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MentionContent } from "@/components/common/mentionable-textarea"
import { UserAvatar } from "@/components/common/user-avatar"
import { UserName } from "@/components/common/user-name"
import { usePermissionContext } from "@/providers/permission-provider"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

import {
  useAttachmentsByComment,
} from "@/hooks/finance/use-cost-attachment"
import {
  useCommentEditHistory,
  useDeleteRequestComment,
  useHideRequestComment,
  useUnhideRequestComment,
  useUpdateRequestComment,
} from "@/hooks/finance/use-cost-request-comment"
import type { CostRequestComment } from "@/types/finance/cost-request-comment"

import { AttachmentList } from "./attachment-list"

interface Props {
  comment: CostRequestComment
  currentUserId: string
}

export function CommentItem({ comment, currentUserId }: Props) {
  const isAuthor = comment.authorUserId === currentUserId
  const { hasAnyRole } = usePermissionContext()
  // Hide/unhide is moderation — restricted to admin roles. Author always keeps
  // edit + delete on their own comment.
  const isAdmin = hasAnyRole("SUPER_ADMIN", "ADMIN")

  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(comment.bodyPlaintext)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [hideOpen, setHideOpen] = useState(false)
  const [hideReason, setHideReason] = useState("")
  const [deleteOpen, setDeleteOpen] = useState(false)

  const updateM = useUpdateRequestComment()
  const hideM = useHideRequestComment()
  const unhideM = useUnhideRequestComment()
  const deleteM = useDeleteRequestComment()
  const { data: attachments } = useAttachmentsByComment(comment.commentId)

  async function onSaveEdit() {
    if (!body.trim()) return
    try {
      await updateM.mutateAsync({
        commentId: comment.commentId,
        bodyRichtext: JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: body }] }] }),
        bodyPlaintext: body,
      })
      setEditing(false)
    } catch {
      /* toast in hook */
    }
  }

  return (
    <div className={`flex gap-3 ${isAuthor ? "" : "flex-row-reverse"} ${comment.isHidden ? "opacity-60" : ""}`}>
      <UserAvatar
        userId={comment.authorUserId}
        colorHash
        className="h-7 w-7 mt-0.5 shrink-0"
        fallbackClassName="text-xs font-semibold"
      />
      <div className="min-w-0 max-w-[75%] rounded-md border bg-card p-3 space-y-2">
      <div className={`flex items-center gap-2 text-xs ${isAuthor ? "" : "flex-row-reverse"}`}>
        <span className="font-medium"><UserName userId={comment.authorUserId} compact /></span>
        <span className="text-muted-foreground">{comment.createdAt?.slice(0, 19).replace("T", " ")}</span>
        {comment.isEdited && (
          <Badge variant="outline" className="text-[10px]">
            edited
          </Badge>
        )}
        {comment.isHidden && (
          <Badge variant="destructive" className="text-[10px]">
            hidden
          </Badge>
        )}
        <div className="flex-1" />
        {comment.isEdited && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setHistoryOpen(true)} title="Edit history">
            <History className="h-3.5 w-3.5" />
          </Button>
        )}
        {isAuthor && !comment.isHidden && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing((v) => !v)} title={editing ? "Cancel edit" : "Edit"}>
            {editing ? <X className="h-3.5 w-3.5" /> : <Edit className="h-3.5 w-3.5" />}
          </Button>
        )}
        {isAdmin && !comment.isHidden && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setHideOpen(true)} title="Hide (admin only)">
            <EyeOff className="h-3.5 w-3.5" />
          </Button>
        )}
        {isAdmin && comment.isHidden && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => unhideM.mutate({ commentId: comment.commentId })} title="Unhide (admin only)">
            <EyeOff className="h-3.5 w-3.5 text-primary" />
          </Button>
        )}
        {isAuthor && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setDeleteOpen(true)}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
          <Button size="sm" onClick={onSaveEdit} disabled={updateM.isPending || !body.trim()}>
            {updateM.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            <Save className="mr-2 h-3.5 w-3.5" /> Save
          </Button>
        </div>
      ) : (
        <p className="text-sm whitespace-pre-wrap">
          {comment.isHidden ? (
            comment.hiddenReason || "(hidden by admin)"
          ) : (
            <MentionContent text={comment.bodyPlaintext} />
          )}
        </p>
      )}


      {/* Attachment upload after post is no longer offered — files are staged in
          the composer before Post via CommentsPanel and uploaded once the
          comment is created. */}
      {(attachments?.length ?? 0) > 0 && (
        <AttachmentList attachments={attachments ?? []} canDelete={isAuthor || isAdmin} />
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete comment"
        description="This comment and its edit history will be permanently removed."
        variant="destructive"
        confirmText="Delete"
        isLoading={deleteM.isPending}
        onConfirm={() => {
          deleteM.mutate(
            { commentId: comment.commentId, requestId: comment.requestId },
            { onSuccess: () => setDeleteOpen(false) },
          )
        }}
      />

      {/* Edit-history dialog */}
      <EditHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} commentId={comment.commentId} />

      {/* Hide-reason dialog */}
      <Dialog open={hideOpen} onOpenChange={setHideOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hide comment</DialogTitle>
            <DialogDescription>Provide a moderation reason — visible to admins only.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason *</Label>
            <Textarea rows={3} value={hideReason} onChange={(e) => setHideReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHideOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!hideReason.trim() || hideM.isPending}
              onClick={() =>
                hideM.mutate(
                  { commentId: comment.commentId, hiddenReason: hideReason.trim() },
                  {
                    onSuccess: () => {
                      setHideOpen(false)
                      setHideReason("")
                    },
                  },
                )
              }
            >
              {hideM.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}

function EditHistoryDialog({ open, onOpenChange, commentId }: { open: boolean; onOpenChange: (o: boolean) => void; commentId: number }) {
  const { data, isLoading } = useCommentEditHistory(open ? commentId : undefined)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit history</DialogTitle>
          <DialogDescription>Snapshots of the comment body taken at each edit, newest first.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!isLoading && (data?.length ?? 0) === 0 && (
            <div className="text-sm text-muted-foreground">No prior edits.</div>
          )}
          {(data ?? []).map((entry) => (
            <div key={entry.editId} className="rounded border p-2 text-sm space-y-1">
              <div className="text-xs text-muted-foreground">
                {entry.editedAt.slice(0, 19).replace("T", " ")} by <UserName userId={entry.editedBy} compact />
              </div>
              <p className="whitespace-pre-wrap">{entry.bodyPlaintext}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
