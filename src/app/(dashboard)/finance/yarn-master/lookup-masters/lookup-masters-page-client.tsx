"use client"

import { useState, useRef } from "react"
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Download, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PageHeader } from "@/components/common/page-header"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import {
  useLookupMasters,
  useLookupMasterColumns,
  useTableColumns,
  useCreateLookupMaster,
  useUpdateLookupMaster,
  useDeleteLookupMaster,
  useCreateLookupMasterColumn,
  useDeleteLookupMasterColumn,
  useExportLookupMasters,
  useImportLookupMasters,
} from "@/hooks/finance/use-lookup-master"
import type { LookupMaster, LookupMasterColumn } from "@/types/finance/lookup-master"

// Auto-generate code from display name: "Machine Master" → "MACHINE_MASTER"
function nameToCode(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
}

// ──────────────────────────────────────────────
// Add Master Dialog (inner form — remounts on open via key)
// ──────────────────────────────────────────────

function AddMasterForm({ onClose }: { onClose: () => void }) {
  const create = useCreateLookupMaster()
  const [code, setCode] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [tableName, setTableName] = useState("")

  function handleNameChange(name: string) {
    setDisplayName(name)
    setCode(nameToCode(name))
  }

  async function handleSubmit() {
    if (!code || !displayName) return
    await create.mutateAsync({
      lmCode: code,
      lmDisplayName: displayName,
      lmTableName: tableName || undefined,
    })
    onClose()
  }

  return (
    <>
      <div className="space-y-4 py-2">
        <div className="space-y-1">
          <Label>
            Display Name <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="e.g., Yarn Type"
            value={displayName}
            onChange={(e) => handleNameChange(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>
            Code{" "}
            <span className="text-xs text-muted-foreground">(auto-generated)</span>
          </Label>
          <Input
            value={code}
            onChange={(e) =>
              setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))
            }
            placeholder="YARN_TYPE"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Unique identifier. Auto-filled from name, can be edited.
          </p>
        </div>
        <div className="space-y-1">
          <Label>
            Table Name{" "}
            <span className="text-xs text-muted-foreground">
              (optional — for column introspection)
            </span>
          </Label>
          <Input
            placeholder="mst_yarn_type"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            PostgreSQL table name. Used to auto-discover columns and populate dropdowns.
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!code || !displayName || create.isPending}>
          Register
        </Button>
      </DialogFooter>
    </>
  )
}

function AddMasterDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Register New Lookup Master</DialogTitle>
        </DialogHeader>
        {/* key forces remount (and thus state reset) each time dialog opens */}
        {open && <AddMasterForm key="add-master-form" onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

// ──────────────────────────────────────────────
// Edit Master Dialog (inner form — remounts on master change via key)
// ──────────────────────────────────────────────

function EditMasterForm({
  master,
  onClose,
}: {
  master: LookupMaster
  onClose: () => void
}) {
  const update = useUpdateLookupMaster()
  const [displayName, setDisplayName] = useState(master.lmDisplayName)
  const [tableName, setTableName] = useState(master.lmTableName ?? "")
  const [isActive, setIsActive] = useState(master.lmIsActive)

  async function handleSave() {
    await update.mutateAsync({
      lmCode: master.lmCode,
      lmDisplayName: displayName,
      lmTableName: tableName,
      lmIsActive: isActive,
    })
    onClose()
  }

  return (
    <>
      <div className="space-y-4 py-2">
        <div className="space-y-1">
          <Label>Display Name</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Table Name</Label>
          <Input
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            className="font-mono"
            placeholder="mst_machine"
          />
          <p className="text-xs text-muted-foreground">
            PostgreSQL table name. Used to auto-discover columns and populate dropdowns.
          </p>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="space-y-0.5">
            <Label>Active</Label>
            <p className="text-xs text-muted-foreground">
              Inactive masters don&apos;t appear in param form dropdowns.
            </p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!displayName || update.isPending}>
          Save
        </Button>
      </DialogFooter>
    </>
  )
}

function EditMasterDialog({
  master,
  open,
  onOpenChange,
}: {
  master: LookupMaster | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit {master?.lmCode}</DialogTitle>
        </DialogHeader>
        {/* key forces remount so form state resets when switching between masters */}
        {open && master && (
          <EditMasterForm
            key={master.lmCode}
            master={master}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

// ──────────────────────────────────────────────
// Add Column Dialog (with table introspection)
// ──────────────────────────────────────────────

function AddColumnForm({
  masterCode,
  tableName,
  onClose,
}: {
  masterCode: string
  tableName: string
  onClose: () => void
}) {
  const createColumn = useCreateLookupMasterColumn()
  const { data: tableColumns = [] } = useTableColumns(tableName || undefined)
  const [selectedCol, setSelectedCol] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [dataType, setDataType] = useState<"NUMBER" | "TEXT">("NUMBER")
  const [sortOrder, setSortOrder] = useState(0)

  function handleColumnSelect(colName: string) {
    setSelectedCol(colName)
    const col = tableColumns.find((c) => c.columnName === colName)
    if (col) {
      setDataType(col.dataType)
      setDisplayName(
        colName
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
      )
    }
  }

  async function handleAdd() {
    if (!selectedCol) return
    await createColumn.mutateAsync({
      lmcMasterCode: masterCode,
      lmcColumnName: selectedCol,
      lmcDisplayName: displayName,
      lmcDataType: dataType,
      lmcSortOrder: sortOrder,
    })
    onClose()
  }

  const hasTable = !!tableName

  return (
    <>
      {!hasTable && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-600">
          No table name configured for this master. Set it via Edit to enable column
          auto-discovery.
        </p>
      )}
      <div className="space-y-4 py-2">
        <div className="space-y-1">
          <Label>
            Column Name{" "}
            {hasTable && (
              <span className="text-xs text-muted-foreground">(from table)</span>
            )}
          </Label>
          {hasTable ? (
            <Select value={selectedCol} onValueChange={handleColumnSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select column…" />
              </SelectTrigger>
              <SelectContent>
                {tableColumns.map((c) => (
                  <SelectItem key={c.columnName} value={c.columnName}>
                    <span className="font-mono">{c.columnName}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({c.rawType})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={selectedCol}
              onChange={(e) => setSelectedCol(e.target.value)}
              placeholder="no_of_position"
              className="font-mono"
            />
          )}
        </div>
        <div className="space-y-1">
          <Label>Display Name</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Machine Speed (m/min)"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>
              Data Type{" "}
              {hasTable && selectedCol && (
                <span className="text-xs text-green-600">(auto-detected)</span>
              )}
            </Label>
            <Select
              value={dataType}
              onValueChange={(v) => setDataType(v as "NUMBER" | "TEXT")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NUMBER">NUMBER</SelectItem>
                <SelectItem value="TEXT">TEXT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Sort Order</Label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
            />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleAdd}
          disabled={!selectedCol || !displayName || createColumn.isPending}
        >
          Add
        </Button>
      </DialogFooter>
    </>
  )
}

function AddColumnDialog({
  masterCode,
  tableName,
  open,
  onOpenChange,
}: {
  masterCode: string
  tableName: string
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Column to {masterCode}</DialogTitle>
        </DialogHeader>
        {/* key forces remount so form state resets on each open */}
        {open && (
          <AddColumnForm
            key={`${masterCode}-add-col`}
            masterCode={masterCode}
            tableName={tableName}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

// ──────────────────────────────────────────────
// Columns Panel
// ──────────────────────────────────────────────

function ColumnsPanel({
  masterCode,
  tableName,
}: {
  masterCode: string
  tableName: string
}) {
  const { data: columns, isLoading } = useLookupMasterColumns(masterCode)
  const deleteColumn = useDeleteLookupMasterColumn()
  const [addOpen, setAddOpen] = useState(false)
  const [deleteColTarget, setDeleteColTarget] = useState<LookupMasterColumn | null>(null)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Fillable Columns
        </span>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Column
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      )}

      {!isLoading &&
        (columns ?? []).map((col) => (
          <div
            key={col.lmcId}
            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs">{col.lmcColumnName}</span>
              <span className="text-muted-foreground">{col.lmcDisplayName}</span>
              <Badge variant="outline" className="text-xs">
                {col.lmcDataType}
              </Badge>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setDeleteColTarget(col)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ))}

      {!isLoading && (columns ?? []).length === 0 && (
        <p className="text-xs italic text-muted-foreground">No columns registered yet.</p>
      )}

      <AddColumnDialog
        masterCode={masterCode}
        tableName={tableName}
        open={addOpen}
        onOpenChange={setAddOpen}
      />

      <ConfirmDialog
        open={!!deleteColTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteColTarget(null)
        }}
        title={`Remove column ${deleteColTarget?.lmcColumnName ?? ""}?`}
        description="This column will no longer appear in the source-column dropdown for param assignment."
        confirmText="Remove"
        variant="destructive"
        onConfirm={() => {
          if (deleteColTarget) {
            deleteColumn.mutate({ lmcId: deleteColTarget.lmcId, masterCode })
          }
          setDeleteColTarget(null)
        }}
      />
    </div>
  )
}

// ──────────────────────────────────────────────
// Main page component
// ──────────────────────────────────────────────

export function LookupMastersPageClient() {
  const { data: masters = [], isLoading } = useLookupMasters(false)
  const deleteMaster = useDeleteLookupMaster()
  const exportM = useExportLookupMasters()
  const importM = useImportLookupMasters()

  const importInputRef = useRef<HTMLInputElement>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<LookupMaster | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LookupMaster | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggleExpand(code: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }
      return next
    })
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) importM.mutate(file)
    e.target.value = ""
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lookup Masters"
        subtitle="Manage the registry of master tables used by MASTER_LOOKUP params"
      >
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportM.mutate()}
            disabled={exportM.isPending}
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => importInputRef.current?.click()}
            disabled={importM.isPending}
          >
            <Upload className="mr-1.5 h-4 w-4" />
            Import
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImport}
          />
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Register Master
          </Button>
        </div>
      </PageHeader>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && masters.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No lookup masters registered yet. Register one to enable MASTER_LOOKUP parameters.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {masters.map((master) => (
          <Card key={master.lmCode} className={!master.lmIsActive ? "opacity-60" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                <span className="font-mono text-sm font-semibold">{master.lmCode}</span>
                <span className="text-sm text-muted-foreground">{master.lmDisplayName}</span>
                {master.lmTableName && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {master.lmTableName}
                  </Badge>
                )}
                {!master.lmIsActive && <Badge variant="secondary">Inactive</Badge>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => toggleExpand(master.lmCode)}
                  title="Manage columns"
                >
                  {expanded.has(master.lmCode) ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditTarget(master)}
                  title="Edit master"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setDeleteTarget(master)}
                  title="Delete master"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            {expanded.has(master.lmCode) && (
              <CardContent>
                <ColumnsPanel
                  masterCode={master.lmCode}
                  tableName={master.lmTableName ?? ""}
                />
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <AddMasterDialog open={addOpen} onOpenChange={setAddOpen} />

      <EditMasterDialog
        master={editTarget}
        open={!!editTarget}
        onOpenChange={(v) => {
          if (!v) setEditTarget(null)
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null)
        }}
        title={`Remove ${deleteTarget?.lmCode ?? ""}?`}
        description={`This removes "${deleteTarget?.lmDisplayName ?? ""}" and all its column definitions from the registry. Param assignments using this master will still work but no new columns can be selected.`}
        confirmText="Remove"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) deleteMaster.mutate(deleteTarget.lmCode)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}
