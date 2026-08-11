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

import { ACTIVE_FILTER_OPTIONS } from "@/types/finance/uom"
import {
  ActiveFilter,
  type ListSpinFixedCostsParams,
  periodToMonthInput,
  monthInputToPeriod,
} from "@/types/finance/spin-fixed-cost"

interface SpinFixedCostFiltersProps {
  filters: ListSpinFixedCostsParams
  onFiltersChange: (filters: ListSpinFixedCostsParams) => void
}

export function SpinFixedCostFilters({ filters, onFiltersChange }: SpinFixedCostFiltersProps) {
  const handleSearchChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, search: value, page: 1 })
    },
    [filters, onFiltersChange]
  )

  const handlePeriodChange = (value: string) => {
    onFiltersChange({ ...filters, period: monthInputToPeriod(value), page: 1 })
  }

  const handleActiveFilterChange = (value: string) => {
    onFiltersChange({
      ...filters,
      activeFilter: Number(value) as ActiveFilter,
      page: 1,
    })
  }

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split("-")
    onFiltersChange({ ...filters, sortBy, sortOrder })
  }

  const handleClearFilters = () => {
    onFiltersChange({
      page: 1,
      pageSize: filters.pageSize,
      search: "",
      period: "",
      activeFilter: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED,
      sortBy: "period",
      sortOrder: "desc",
    })
  }

  const hasActiveFilters =
    !!filters.search ||
    !!filters.period ||
    (filters.activeFilter !== undefined &&
      filters.activeFilter !== ActiveFilter.ACTIVE_FILTER_UNSPECIFIED)

  // Sort options are limited to the columns the backend can sort by
  // (period, created_at, updated_at).
  const currentSort = `${filters.sortBy || "period"}-${filters.sortOrder || "desc"}`

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <DebouncedSearchInput
        value={filters.search || ""}
        onValueChange={handleSearchChange}
        placeholder="Search period..."
        debounceMs={300}
        containerClassName="flex-1 sm:max-w-sm"
      />

      <div className="flex flex-wrap items-center gap-2">
        {/* Period filter — month picker, submitted as YYYYMM */}
        <Input
          type="month"
          aria-label="Filter by period"
          className="w-[160px]"
          value={periodToMonthInput(filters.period || "")}
          onChange={(e) => handlePeriodChange(e.target.value)}
        />

        <Select
          value={String(filters.activeFilter ?? ActiveFilter.ACTIVE_FILTER_UNSPECIFIED)}
          onValueChange={handleActiveFilterChange}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {ACTIVE_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={currentSort} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="period-desc">Period (Newest)</SelectItem>
            <SelectItem value="period-asc">Period (Oldest)</SelectItem>
            <SelectItem value="created_at-desc">Created (Newest)</SelectItem>
            <SelectItem value="created_at-asc">Created (Oldest)</SelectItem>
            <SelectItem value="updated_at-desc">Updated (Newest)</SelectItem>
            <SelectItem value="updated_at-asc">Updated (Oldest)</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-10">
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
