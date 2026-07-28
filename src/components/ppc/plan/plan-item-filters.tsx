"use client"

import { useCallback } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DebouncedSearchInput } from "@/components/common"
import { MachineGroupCombobox } from "@/components/ppc/comboboxes"

import {
  PLAN_ITEM_TYPE_OPTIONS,
  PLAN_ITEM_STATUS_OPTIONS,
  PlanItemType,
  PlanItemStatus,
} from "@/types/ppc/common"
import type { ListPlanItemsParams } from "@/types/ppc/plan-item"

interface PlanItemFiltersProps {
  filters: ListPlanItemsParams
  onFiltersChange: (filters: ListPlanItemsParams) => void
}

export function PlanItemFilters({ filters, onFiltersChange }: PlanItemFiltersProps) {
  const handleSearchChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, search: value, page: 1 })
    },
    [filters, onFiltersChange]
  )

  const handleMonthChange = (value: string) => {
    onFiltersChange({ ...filters, month: value, page: 1 })
  }

  const handleTypeChange = (value: string) => {
    onFiltersChange({ ...filters, type: Number(value) as PlanItemType, page: 1 })
  }

  const handleStatusChange = (value: string) => {
    onFiltersChange({ ...filters, status: Number(value) as PlanItemStatus, page: 1 })
  }

  const handleMachineGroupChange = (value: number | undefined) => {
    onFiltersChange({ ...filters, machineGroupId: value, page: 1 })
  }

  const handleClear = () => {
    onFiltersChange({
      page: 1,
      pageSize: filters.pageSize,
      search: "",
      month: "",
      type: PlanItemType.PLAN_ITEM_TYPE_UNSPECIFIED,
      status: PlanItemStatus.PLAN_ITEM_STATUS_UNSPECIFIED,
      machineGroupId: undefined,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    })
  }

  const hasActiveFilters =
    !!filters.search ||
    !!filters.month ||
    (filters.type !== undefined && filters.type !== PlanItemType.PLAN_ITEM_TYPE_UNSPECIFIED) ||
    (filters.status !== undefined && filters.status !== PlanItemStatus.PLAN_ITEM_STATUS_UNSPECIFIED) ||
    filters.machineGroupId !== undefined

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <DebouncedSearchInput
        value={filters.search || ""}
        onValueChange={handleSearchChange}
        placeholder="Search product code or name..."
        debounceMs={300}
        containerClassName="flex-1 sm:max-w-sm"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="month"
          value={filters.month || ""}
          onChange={(e) => handleMonthChange(e.target.value)}
          className="w-[150px]"
          aria-label="Month"
        />

        <Select
          value={String(filters.type ?? PlanItemType.PLAN_ITEM_TYPE_UNSPECIFIED)}
          onValueChange={handleTypeChange}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {PLAN_ITEM_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={String(o.value)}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(filters.status ?? PlanItemStatus.PLAN_ITEM_STATUS_UNSPECIFIED)}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {PLAN_ITEM_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={String(o.value)}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <MachineGroupCombobox
          value={filters.machineGroupId}
          onChange={(id) => handleMachineGroupChange(id)}
          placeholder="Machine group"
          className="w-[180px]"
        />

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="h-10">
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
