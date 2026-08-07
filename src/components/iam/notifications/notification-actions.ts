// Helpers for executing notification click-actions on the frontend.

import {
  Notification,
  NotificationActionType,
  parseActionPayload,
  DownloadPayload,
  NavigatePayload,
  ExternalLinkPayload,
} from "@/types/iam/notification"

// Download endpoints registered per notification source_type. The value is the
// BFF route prefix; the notification's source_id (the export job id) is appended
// as the path segment, e.g. /api/v1/finance/exports/{job_id}/download.
const DOWNLOAD_ROUTE_BY_SOURCE_TYPE: Record<string, string> = {
  "finance.rm_cost_export": "/api/v1/finance/exports",
  "finance.product_cost_sheet_export": "/api/v1/finance/cost-results/exports",
}

// executeNotificationAction performs the click-action for a notification.
// Returns true when an action ran (so the caller can mark-as-read), false
// when nothing was actionable (e.g. NONE or CUSTOM with no handler).
export function executeNotificationAction(
  notif: Notification,
  router: { push: (href: string) => void } | null,
): boolean {
  switch (notif.actionType) {
    case NotificationActionType.NOTIFICATION_ACTION_TYPE_DOWNLOAD: {
      const p = parseActionPayload<DownloadPayload>(notif)
      if (!p?.file_path && !notif.sourceId) return false
      // Generic download endpoint: callers register one per source_type.
      const prefix = DOWNLOAD_ROUTE_BY_SOURCE_TYPE[notif.sourceType]
      if (prefix && notif.sourceId) {
        // Open in a new tab so the active page (notifications dropdown / list)
        // stays in place; the new tab redirects to MinIO and the browser saves
        // the file. The tab usually self-closes after the download trigger.
        window.open(
          `${prefix}/${encodeURIComponent(notif.sourceId)}/download`,
          "_blank",
          "noopener,noreferrer",
        )
        return true
      }
      return false
    }
    case NotificationActionType.NOTIFICATION_ACTION_TYPE_NAVIGATE: {
      const p = parseActionPayload<NavigatePayload>(notif)
      if (!p?.path) return false
      if (router) router.push(p.path)
      else window.location.href = p.path
      return true
    }
    case NotificationActionType.NOTIFICATION_ACTION_TYPE_EXTERNAL_LINK: {
      const p = parseActionPayload<ExternalLinkPayload>(notif)
      if (!p?.url) return false
      window.open(p.url, "_blank", "noopener,noreferrer")
      return true
    }
    case NotificationActionType.NOTIFICATION_ACTION_TYPE_NONE:
    case NotificationActionType.NOTIFICATION_ACTION_TYPE_UNSPECIFIED:
    case NotificationActionType.NOTIFICATION_ACTION_TYPE_CUSTOM:
    default:
      return false
  }
}
