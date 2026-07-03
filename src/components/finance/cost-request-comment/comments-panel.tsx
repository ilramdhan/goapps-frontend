"use client"

// CommentsPanel — embedded in the request detail page. Lists comments + offers a
// composer at the bottom. Plaintext-only in S6; richtext field is set to a minimal
// Tiptap-compatible JSON wrapper so future rich-text rollout is a drop-in upgrade.
import { useRef, useState } from "react"
import { Loader2, Paperclip, Send, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MentionableTextarea } from "@/components/common/mentionable-textarea"
import { UserAvatar } from "@/components/common/user-avatar"
import { useAuth } from "@/providers/auth-provider"
import { useCreateRequestComment, useRequestComments } from "@/hooks/finance/use-cost-request-comment"
import { useUploadAttachment } from "@/hooks/finance/use-cost-attachment"

import { CommentItem } from "./comment-item"

interface Props {
  requestId: number
  /** When true the request is terminal: hide the composer (read-only thread). */
  readOnly?: boolean
}

function wrapRichtext(plain: string): string {
  return JSON.stringify({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: plain }] }],
  })
}


const MAX_ATTACH_BYTES = 25 * 1024 * 1024 // FR-5 hard cap

export function CommentsPanel({ requestId, readOnly = false }: Props) {
  const { user } = useAuth()
  const { data: comments, isLoading } = useRequestComments(requestId)
  const [body, setBody] = useState("")
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([])
  const [stagedFiles, setStagedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const createM = useCreateRequestComment()
  const uploadM = useUploadAttachment()

  function pickFiles() {
    fileInputRef.current?.click()
  }

  function onFilesPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (files.length === 0) return
    const ok = files.filter((f) => {
      if (f.size > MAX_ATTACH_BYTES) {
        alert(`${f.name} exceeds 25 MB limit.`)
        return false
      }
      return true
    })
    setStagedFiles((prev) => [...prev, ...ok])
  }

  function removeStaged(idx: number) {
    setStagedFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  async function onSubmit() {
    const text = body.trim()
    if (!text) return
    try {
      const created = await createM.mutateAsync({
        requestId,
        bodyRichtext: wrapRichtext(text),
        bodyPlaintext: text,
        mentionedUserIds,
      })
      // Upload any staged attachments and bind them to the new comment.
      for (const file of stagedFiles) {
        try {
          await uploadM.mutateAsync({ file, commentId: created.commentId })
        } catch {
          // Per-file failure already surfaced via toast in hook; keep going so
          // partial success isn't silent.
        }
      }
      setBody("")
      setStagedFiles([])
      setMentionedUserIds([])
    } catch {
      /* toast in hook */
    }
  }

  const currentUserId = user?.userId || ""

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Comments</CardTitle>
        <p className="text-xs text-muted-foreground">
          Type <span className="font-mono">@name</span> to mention and notify a teammate.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-[480px] overflow-y-auto space-y-3 pr-1">
          {isLoading && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          )}
          {!isLoading && (comments?.length ?? 0) === 0 && (
            <div className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
              No comments yet — be the first to post.
            </div>
          )}
          {(comments ?? []).map((c) => (
            <CommentItem key={c.commentId} comment={c} currentUserId={currentUserId} />
          ))}
        </div>

        {readOnly ? (
          <div className="rounded-md border border-dashed py-3 text-center text-xs text-muted-foreground">
            Request is read-only — commenting is disabled.
          </div>
        ) : (
          <div className="flex gap-3 pt-2 border-t items-start">
            <UserAvatar
              userId={currentUserId}
              colorHash
              className="h-7 w-7 mt-1 shrink-0"
              fallbackClassName="text-xs font-semibold"
            />
            <div className="flex-1 space-y-2 min-w-0">
              <MentionableTextarea
                rows={3}
                value={body}
                onChange={setBody}
                onMentionsChange={setMentionedUserIds}
                placeholder="Add a comment… @mention to notify someone."
                disabled={createM.isPending}
              />
              {stagedFiles.length > 0 && (
                <ul className="rounded border bg-muted/30 p-2 space-y-1 text-xs">
                  {stagedFiles.map((f, idx) => (
                    <li key={`${f.name}-${idx}`} className="flex items-center gap-2">
                      <Paperclip className="h-3 w-3 shrink-0" />
                      <span className="truncate flex-1">{f.name}</span>
                      <span className="text-muted-foreground">
                        {(f.size / 1024).toFixed(1)} KB
                      </span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeStaged(idx)}
                        title="Remove"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={onFilesPicked}
              />
              <div className="flex items-center justify-between">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={pickFiles}
                  disabled={createM.isPending}
                >
                  <Paperclip className="mr-2 h-3.5 w-3.5" /> Attach files
                </Button>
                <Button
                  size="sm"
                  onClick={onSubmit}
                  disabled={createM.isPending || uploadM.isPending || !body.trim()}
                >
                  {(createM.isPending || uploadM.isPending) && (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  )}
                  <Send className="mr-2 h-3.5 w-3.5" /> Post
                  {stagedFiles.length > 0 && ` + ${stagedFiles.length} file(s)`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
