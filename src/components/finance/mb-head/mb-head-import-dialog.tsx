"use client"

import { useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

import type { DuplicateAction, ImportError } from "@/types/finance/uom"
import { useImportMBHeads, useDownloadMBHeadTemplate } from "@/hooks/finance/use-mb-head"
import { readFileAsBytes } from "@/lib/api"

interface MBHeadImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface ImportResult {
  successCount: number
  updatedCount: number
  skippedCount: number
  failedCount: number
  errors: ImportError[]
}

/** upload → (dry run) → preview → (real import) → done */
type Step = "upload" | "preview" | "done"

const VALID_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]

export function MBHeadImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: MBHeadImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [duplicateAction, setDuplicateAction] = useState<DuplicateAction>("skip")
  const [step, setStep] = useState<Step>("upload")
  const [preview, setPreview] = useState<ImportResult | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  function resetState() {
    setSelectedFile(null)
    setDuplicateAction("skip")
    setStep("upload")
    setPreview(null)
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset dialog state on each reopen
    if (open) resetState()
  }, [open])

  const importMutation = useImportMBHeads()
  const templateMutation = useDownloadMBHeadTemplate()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!VALID_MIME_TYPES.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error("Please select a valid Excel file (.xlsx or .xls)")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    setSelectedFile(file)
    setStep("upload")
    setPreview(null)
    setResult(null)
  }

  const runImport = async (dryRun: boolean): Promise<ImportResult | null> => {
    if (!selectedFile) return null
    try {
      const fileContent = await readFileAsBytes(selectedFile)
      const response = await importMutation.mutateAsync({
        fileContent,
        fileName: selectedFile.name,
        duplicateAction,
        dryRun,
      })
      return {
        successCount: response.successCount,
        updatedCount: response.updatedCount,
        skippedCount: response.skippedCount,
        failedCount: response.failedCount,
        errors: response.errors,
      }
    } catch (error) {
      console.error(dryRun ? "Import validation failed:" : "Import failed:", error)
      return null
    }
  }

  const handleValidate = async () => {
    const res = await runImport(true)
    if (!res) return
    setPreview(res)
    setStep("preview")
  }

  const handleConfirm = async () => {
    const res = await runImport(false)
    if (!res) return
    setResult(res)
    setStep("done")
    if (res.successCount > 0 || res.updatedCount > 0) onSuccess?.()
  }

  const handleClose = () => {
    resetState()
    onOpenChange(false)
  }

  const isProcessing = importMutation.isPending || templateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Import MB Heads</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Select an Excel file. It is validated first — nothing is written until you confirm."}
            {step === "preview" && "Dry run only — no data has been written yet. Review the result, then confirm to import."}
            {step === "done" && "Import finished."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === "upload" && (
            <>
              {/* Template Download */}
              <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 shrink-0 text-green-600" />
                  <div className="min-w-0">
                    <p className="font-medium">Import Template</p>
                    <p className="text-sm text-muted-foreground">
                      Download the Excel template with required columns
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 self-end sm:self-auto"
                  onClick={() => void templateMutation.mutateAsync().catch(() => undefined)}
                  disabled={isProcessing}
                >
                  {templateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Download
                </Button>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label>Select File</Label>
                <div
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors hover:border-primary/50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div className="flex min-w-0 max-w-full items-center gap-2">
                      <FileSpreadsheet className="h-6 w-6 shrink-0 text-green-600" />
                      <span className="min-w-0 truncate font-medium">{selectedFile.name}</span>
                      <span className="shrink-0 text-sm text-muted-foreground">
                        ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  ) : (
                    <>
                      <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-center text-sm text-muted-foreground">
                        Click to select or drag and drop an Excel file
                      </p>
                      <p className="text-xs text-muted-foreground">Supported: .xlsx, .xls</p>
                    </>
                  )}
                </div>
              </div>

              {/* Duplicate Action */}
              <div className="space-y-2">
                <Label>Duplicate Handling</Label>
                <Select
                  value={duplicateAction}
                  onValueChange={(value: DuplicateAction) => setDuplicateAction(value)}
                  disabled={isProcessing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Skip - Ignore duplicate records</SelectItem>
                    <SelectItem value="update">Update - Overwrite existing records</SelectItem>
                    <SelectItem value="error">Error - Stop on duplicate found</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {step === "preview" && preview && (
            <ResultPanel result={preview} mode="preview" fileName={selectedFile?.name} />
          )}

          {step === "done" && result && (
            <ResultPanel result={result} mode="final" fileName={selectedFile?.name} />
          )}
        </div>

        <DialogFooter>
          {step === "upload" && (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={() => void handleValidate()} disabled={!selectedFile || isProcessing}>
                {importMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                Validate
              </Button>
            </>
          )}

          {step === "preview" && (
            <>
              <Button
                variant="outline"
                onClick={() => { setStep("upload"); setPreview(null) }}
                disabled={isProcessing}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={() => void handleConfirm()}
                disabled={isProcessing || !preview || preview.successCount + preview.updatedCount === 0}
              >
                {importMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Confirm Import
              </Button>
            </>
          )}

          {step === "done" && (
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ResultPanel({
  result,
  mode,
  fileName,
}: {
  result: ImportResult
  mode: "preview" | "final"
  fileName?: string
}) {
  const isPreview = mode === "preview"
  const hasFailures = result.failedCount > 0
  const nothingToImport = result.successCount + result.updatedCount === 0

  // The backend caps the returned error list (200 rows max) — never assume it is complete.
  const hiddenErrors = Math.max(0, result.failedCount - result.errors.length)

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        {hasFailures ? (
          nothingToImport ? (
            <XCircle className="h-5 w-5 shrink-0 text-destructive" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-yellow-600" />
          )
        ) : (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
        )}
        <span className="min-w-0 truncate font-medium">
          {isPreview ? "Validation result" : "Import complete"}
          {fileName ? ` — ${fileName}` : ""}
        </span>
      </div>

      {isPreview && (
        <p className="text-xs text-muted-foreground">
          Dry run — nothing has been written. These are the counts you will get on confirm.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 text-sm">
        <CountRow label={isPreview ? "To create" : "Created"} value={result.successCount} className="text-green-600" />
        <CountRow label={isPreview ? "To update" : "Updated"} value={result.updatedCount} className="text-blue-600" />
        <CountRow label="Skipped" value={result.skippedCount} className="text-muted-foreground" />
        <CountRow label="Failed" value={result.failedCount} className="text-destructive" />
      </div>

      {isPreview && nothingToImport && (
        <p className="text-sm text-destructive">
          No row would be imported. Fix the file and validate again.
        </p>
      )}

      {result.errors.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-destructive">Errors:</p>
          <ScrollArea className="h-32 rounded border p-2">
            <ul className="space-y-1 text-sm">
              {result.errors.map((error, index) => (
                <li key={`${error.rowNumber}-${error.field}-${index}`} className="text-destructive">
                  {error.rowNumber > 0 ? `Row ${error.rowNumber}: ` : ""}
                  {error.field ? `${error.field} - ` : ""}
                  {error.message}
                </li>
              ))}
            </ul>
          </ScrollArea>
          {hiddenErrors > 0 && (
            <p className="text-xs text-muted-foreground">
              Showing {result.errors.length} of {result.failedCount} errors — {hiddenErrors} more not
              listed. Fix these first, then validate again.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function CountRow({
  label,
  value,
  className,
}: {
  label: string
  value: number
  className?: string
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}:</span>
      <span className={`font-medium ${className ?? ""}`}>{value.toLocaleString()}</span>
    </div>
  )
}
