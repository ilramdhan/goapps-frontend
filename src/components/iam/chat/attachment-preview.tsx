"use client"

import { useState } from "react"
import Image from "next/image"
import { Attachment } from "@/types/iam/chat"
import { cn } from "@/lib/utils"
import { FileText, Download, FileArchive, FileSpreadsheet, File as FileIcon } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

function formatFileSize(bytes: number): string {
  if (bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function isImage(contentType: string): boolean {
  return contentType.startsWith("image/")
}

function fileIconEl(contentType: string, className: string) {
  if (contentType.includes("zip")) return <FileArchive className={className} />
  if (contentType.includes("sheet") || contentType.includes("excel") || contentType.includes("csv")) {
    return <FileSpreadsheet className={className} />
  }
  if (contentType.includes("pdf") || contentType.includes("word") || contentType.startsWith("text/")) {
    return <FileText className={className} />
  }
  return <FileIcon className={className} />
}

interface AttachmentPreviewProps {
  attachment: Attachment
  isSender: boolean
}

// AttachmentPreview renders a single chat attachment: images inline (with a
// click-to-zoom lightbox), other file types as a downloadable chip.
export function AttachmentPreview({ attachment, isSender }: AttachmentPreviewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)

  if (isImage(attachment.contentType)) {
    const src = attachment.thumbnailUrl || attachment.fileUrl
    return (
      <>
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="block overflow-hidden rounded-lg border bg-background/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Open image ${attachment.fileName}`}
        >
          {/* Unoptimized: MinIO URLs are not registered Next image domains. */}
          <Image
            src={src}
            alt={attachment.fileName}
            width={240}
            height={240}
            unoptimized
            className="max-h-60 w-auto max-w-full object-cover"
          />
        </button>
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-3xl p-2">
            <DialogTitle className="sr-only">{attachment.fileName}</DialogTitle>
            <Image
              src={attachment.fileUrl}
              alt={attachment.fileName}
              width={1200}
              height={1200}
              unoptimized
              className="h-auto max-h-[80vh] w-full rounded-md object-contain"
            />
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <a
      href={attachment.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      download={attachment.fileName}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
        isSender
          ? "border-primary-foreground/20 bg-primary-foreground/10 hover:bg-primary-foreground/20"
          : "bg-background/60 hover:bg-background"
      )}
    >
      {fileIconEl(attachment.contentType, "h-5 w-5 shrink-0 opacity-80")}
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{attachment.fileName}</span>
        <span className="text-[10px] opacity-70">{formatFileSize(attachment.fileSize)}</span>
      </span>
      <Download className="ml-1 h-4 w-4 shrink-0 opacity-60" />
    </a>
  )
}

interface AttachmentListProps {
  attachments: Attachment[]
  isSender: boolean
}

// AttachmentList renders all attachments for a message in a compact column.
export function AttachmentList({ attachments, isSender }: AttachmentListProps) {
  if (attachments.length === 0) return null
  return (
    <div className="mt-1 flex flex-col gap-1.5">
      {attachments.map((a) => (
        <AttachmentPreview key={a.attachmentId} attachment={a} isSender={isSender} />
      ))}
    </div>
  )
}
