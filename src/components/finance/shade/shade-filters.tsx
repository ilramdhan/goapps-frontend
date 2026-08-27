"use client"

import { useCallback } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DebouncedSearchInput } from "@/components/common"

import {
  ActiveFilter,
  ACTIVE_FILTER_OPTIONS,
  SOURCE_FILTER_OPTIONS,
  SORT_BY_OPTIONS,
  type ListShadesParams,
} from "@/types/finance/shade"

interface ShadeFiltersProps {
  filters: ListShadesParams
  onFiltersChange: (filters: ListShadesParams) => void
}

export function ShadeFilters({ filters, onFiltersChange }: ShadeFiltersProps) {
  const handleSearchChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, search: value, page: 1 })
    },
    [filters, onFiltersChange]
  )

  const handleActiveFilterChange = (value: string) => {
    onFiltersChange({
      ...filters,
      activeFilter: Number(value) as ActiveFilter,
      page: 1,
    })
  }

  const handleSourceFilterChange = (value: string) => {
    onFiltersChange({ ...filters, sourceFilter: value === "all" ? "" : value, page: 1 })
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
      activeFilter: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED,
      sourceFilter: "",
    })
  }

  const hasActiveFilters =
    !!filters.search ||
    !!filters.sourceFilter ||
    (filters.activeFilter !== undefined && filters.activeFilter !== ActiveFilter.ACTIVE_FILTER_UNSPECIFIED)

  const currentSort = `${filters.sortBy || "code"}-${filters.sortOrder || "asc"}`

  return (
    <div className="flex flex-wrap items-center gap-3">
      <DebouncedSearchInput
        value={filters.search || ""}
        onValueChange={handleSearchChange}
        placeholder="Search by code, name, or short name..."
        debounceMs={300}
        containerClassName="flex-1 sm:max-w-sm"
      />

      <Select
        value={String(filters.activeFilter ?? ActiveFilter.ACTIVE_FILTER_UNSPECIFIED)}
        onValueChange={handleActiveFilterChange}
      >
        <SelectTrigger className="w-[130px]">
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

      <Select value={filters.sourceFilter || "all"} onValueChange={handleSourceFilterChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          {SOURCE_FILTER_OPTIONS.map((option) => (
            <SelectItem key={option.value || "all"} value={option.value || "all"}>
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
          {SORT_BY_OPTIONS.map((option) => (
            <SelectItem key={`${option.value}-asc`} value={`${option.value}-asc`}>
              {option.label} (A-Z)
            </SelectItem>
          ))}
          {SORT_BY_OPTIONS.map((option) => (
            <SelectItem key={`${option.value}-desc`} value={`${option.value}-desc`}>
              {option.label} (Z-A)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-10">
          <X className="mr-1.5 h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  )
}
