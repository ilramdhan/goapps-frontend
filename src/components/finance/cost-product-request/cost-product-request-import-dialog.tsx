"use client"

import { useState, useRef } from "react"
import { Loader2, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

import type { ImportError } from "@/types/finance/cost-product-request"
import {
  useImportCostProductRequests,
  useDownloadCostProductRequestTemplate,
} from "@/hooks/finance/use-cost-product-request"
import { readFileAsBytes } from "@/lib/api"

interface CostProductRequestImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface ImportResult {
  successCount: number
  skippedCount: number
  updatedCount: number
  failedCount: number
  errors: ImportError[]
}

// duplicate_action has no skip/update effect server-side for this create-only
// import (design.md §4 D6) — fixed to "error" (a no-op value here) rather than
// exposing a selector the user would expect to actually change behavior.
const CREATE_ONLY_DUPLICATE_ACTION = "error"

export function CostProductRequestImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: CostProductRequestImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const importMutation = useImportCostProductRequests()
  const templateMutation = useDownloadCostProductRequestTemplate()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ]
      if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
        alert("Please select a valid Excel file (.xlsx or .xls)")
        return
      }
      setSelectedFile(file)
      setImportResult(null)
    }
  }

  const handleImport = async () => {
    if (!selectedFile) return

    try {
      const fileContent = await readFileAsBytes(selectedFile)
      const response = await importMutation.mutateAsync({
        fileContent,
        fileName: selectedFile.name,
        duplicateAction: CREATE_ONLY_DUPLICATE_ACTION,
      })

      setImportResult({
        successCount: response.successCount,
        skippedCount: response.skippedCount,
        updatedCount: response.updatedCount,
        failedCount: response.failedCount,
        errors: response.errors,
      })

      if (response.successCount > 0) {
        onSuccess?.()
      }
    } catch (error) {
      console.error("Import failed:", error)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      await templateMutation.mutateAsync()
    } catch (error) {
      console.error("Failed to download template:", error)
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setImportResult(null)
    onOpenChange(false)
  }

  const isProcessing = importMutation.isPending || templateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Import Product Requests</DialogTitle>
          <DialogDescription>
            Import product requests from an Excel file. Each row creates a new
            draft request. Download the template first to ensure proper
            formatting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Download */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-medium">Import Template</p>
                <p className="text-sm text-muted-foreground">
                  Download the Excel template with required columns
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
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
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-6 w-6 text-green-600" />
                  <span className="font-medium">{selectedFile.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              ) : (
                <>
                  <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to select or drag and drop an Excel file
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supported: .xlsx, .xls
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Import Result */}
          {importResult && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                {importResult.failedCount === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                <span className="font-medium">Import Complete</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium text-green-600">
                    {importResult.successCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Failed:</span>
                  <span className="font-medium text-destructive">
                    {importResult.failedCount}
                  </span>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">
                    Errors:
                  </p>
                  <ScrollArea className="h-32 rounded border p-2">
                    <ul className="space-y-1 text-sm">
                      {importResult.errors.map((error, index) => (
                        <li key={index} className="text-destructive">
                          Row {error.rowNumber}: {error.field} - {error.message}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            {importResult ? "Close" : "Cancel"}
          </Button>
          {!importResult && (
            <Button
              onClick={handleImport}
              disabled={!selectedFile || isProcessing}
            >
              {importMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Import
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
