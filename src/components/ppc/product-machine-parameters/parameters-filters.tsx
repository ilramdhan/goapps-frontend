"use client"

import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ProductCombobox, MachineCombobox } from "@/components/ppc/comboboxes"

import type { ListProductMachineParametersParams } from "@/types/ppc/master"

interface ParametersFiltersProps {
  filters: ListProductMachineParametersParams
  onFiltersChange: (filters: ListProductMachineParametersParams) => void
}

export function ParametersFilters({ filters, onFiltersChange }: ParametersFiltersProps) {
  const handleClearFilters = () => {
    onFiltersChange({
      page: 1,
      pageSize: filters.pageSize,
      cpmProductSysId: undefined,
      machineId: undefined,
    })
  }

  const hasActiveFilters =
    filters.cpmProductSysId !== undefined || filters.machineId !== undefined

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Product</Label>
        <ProductCombobox
          value={filters.cpmProductSysId}
          onChange={(id) => onFiltersChange({ ...filters, cpmProductSysId: id, page: 1 })}
          className="w-[220px]"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Machine</Label>
        <MachineCombobox
          value={filters.machineId}
          onChange={(id) => onFiltersChange({ ...filters, machineId: id, page: 1 })}
          className="w-[220px]"
        />
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-10">
          <X className="mr-1 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  )
}
