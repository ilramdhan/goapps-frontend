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

import { ActiveFilter, ACTIVE_FILTER_OPTIONS } from "@/types/finance/uom"
import { type ListRMGroupsParams } from "@/types/finance/rm-group"

interface GroupFiltersProps {
  filters: ListRMGroupsParams
  onFiltersChange: (filters: ListRMGroupsParams) => void
}

export function GroupFilters({ filters, onFiltersChange }: GroupFiltersProps) {
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

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split("-")
    onFiltersChange({ ...filters, sortBy, sortOrder })
  }

  const handleOilFilterChange = (value: string) => {
    onFiltersChange({
      ...filters,
      isOilGroup: value === "all" ? undefined : value === "oil",
      page: 1,
    })
  }

  const handleClearFilters = () => {
    onFiltersChange({
      page: 1,
      pageSize: filters.pageSize,
      search: "",
      activeFilter: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED,
      sortBy: "code",
      sortOrder: "asc",
      isOilGroup: undefined,
    })
  }

  const hasActiveFilters =
    filters.search ||
    (filters.activeFilter !== undefined && filters.activeFilter !== ActiveFilter.ACTIVE_FILTER_UNSPECIFIED) ||
    filters.isOilGroup !== undefined

  const currentSort = `${filters.sortBy || "code"}-${filters.sortOrder || "asc"}`

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <DebouncedSearchInput
        value={filters.search || ""}
        onValueChange={handleSearchChange}
        placeholder="Search code, name..."
        debounceMs={300}
        containerClassName="flex-1 sm:max-w-sm"
      />

      <div className="flex flex-wrap items-center gap-2">
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

        <Select
          value={filters.isOilGroup === undefined ? "all" : filters.isOilGroup ? "oil" : "non-oil"}
          onValueChange={handleOilFilterChange}
        >
          <SelectTrigger className="w-[110px]">
            <SelectValue placeholder="Oil" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            <SelectItem value="oil">Oil Only</SelectItem>
            <SelectItem value="non-oil">Non-Oil</SelectItem>
          </SelectContent>
        </Select>

        <Select value={currentSort} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="code-asc">Code (A-Z)</SelectItem>
            <SelectItem value="code-desc">Code (Z-A)</SelectItem>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="created_at-desc">Newest First</SelectItem>
            <SelectItem value="created_at-asc">Oldest First</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-10"
          >
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
