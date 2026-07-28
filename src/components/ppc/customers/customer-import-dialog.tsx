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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

import type { CustomerDuplicateAction, CustomerImportError } from "@/types/ppc/customer"
import { useImportCustomers, useDownloadCustomerTemplate } from "@/hooks/ppc/use-customer"
import { readFileAsBytes } from "@/lib/api"

interface CustomerImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ImportSummary {
  successCount: number
  skippedCount: number
  updatedCount: number
  failedCount: number
  errors: CustomerImportError[]
}

export function CustomerImportDialog({ open, onOpenChange }: CustomerImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [duplicateAction, setDuplicateAction] = useState<CustomerDuplicateAction>("skip")
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  const importMutation = useImportCustomers()
  const templateMutation = useDownloadCustomerTemplate()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alert("Please select a valid Excel file (.xlsx or .xls)")
      return
    }
    setSelectedFile(file)
    setSummary(null)
  }

  const handleImport = async () => {
    if (!selectedFile) return
    try {
      const fileContent = await readFileAsBytes(selectedFile)
      const response = await importMutation.mutateAsync({
        fileContent,
        fileName: selectedFile.name,
        duplicateAction,
      })
      setSummary({
        successCount: response.successCount,
        skippedCount: response.skippedCount,
        updatedCount: response.updatedCount,
        failedCount: response.failedCount,
        errors: response.errors,
      })
    } catch (error) {
      console.error("Customer import failed:", error)
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setSummary(null)
    setDuplicateAction("skip")
    onOpenChange(false)
  }

  const isProcessing = importMutation.isPending || templateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Import Customers</DialogTitle>
          <DialogDescription>
            Imported rows are marked MANUAL. Download the template first so the columns line up.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-medium">Import Template</p>
                <p className="text-sm text-muted-foreground">
                  Excel template with the required columns
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => templateMutation.mutate()}
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
                    Click to select an Excel file
                  </p>
                  <p className="text-xs text-muted-foreground">Supported: .xlsx, .xls</p>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Duplicate Handling</Label>
            <Select
              value={duplicateAction}
              onValueChange={(value: CustomerDuplicateAction) => setDuplicateAction(value)}
              disabled={isProcessing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="skip">Skip — leave the existing customer alone</SelectItem>
                <SelectItem value="update">Update — overwrite the existing customer</SelectItem>
                <SelectItem value="error">Error — report the row as failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {summary && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                {summary.failedCount === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                <span className="font-medium">Import Complete</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium text-green-600">{summary.successCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated:</span>
                  <span className="font-medium text-blue-600">{summary.updatedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Skipped:</span>
                  <span className="font-medium text-muted-foreground">{summary.skippedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Failed:</span>
                  <span className="font-medium text-destructive">{summary.failedCount}</span>
                </div>
              </div>

              {summary.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">Errors:</p>
                  <ScrollArea className="h-32 rounded border p-2">
                    <ul className="space-y-1 text-sm">
                      {summary.errors.map((error, index) => (
                        <li key={index} className="text-destructive">
                          Row {error.rowNumber}: {error.field} — {error.message}
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
            {summary ? "Close" : "Cancel"}
          </Button>
          {!summary && (
            <Button onClick={handleImport} disabled={!selectedFile || isProcessing}>
              {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
