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

import type { ListCustomersParams } from "@/types/ppc/customer"
import { CUSTOMER_SOURCE_OPTIONS } from "@/types/ppc/customer"
import { ACTIVE_FILTER_OPTIONS, ActiveFilter } from "@/types/ppc/common"

interface CustomersFiltersProps {
  filters: ListCustomersParams
  onFiltersChange: (filters: ListCustomersParams) => void
}

// Select cannot hold an empty string value, so "all sources" gets a sentinel.
const ALL_SOURCES = "ALL"

export function CustomersFilters({ filters, onFiltersChange }: CustomersFiltersProps) {
  const handleSearchChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, search: value, page: 1 })
    },
    [filters, onFiltersChange]
  )

  const handleActiveFilterChange = (value: string) => {
    onFiltersChange({ ...filters, activeFilter: Number(value) as ActiveFilter, page: 1 })
  }

  const handleSourceChange = (value: string) => {
    onFiltersChange({ ...filters, customerSource: value === ALL_SOURCES ? "" : value, page: 1 })
  }

  const handleClearFilters = () => {
    onFiltersChange({
      page: 1,
      pageSize: filters.pageSize,
      search: "",
      activeFilter: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED,
      customerSource: "",
    })
  }

  const hasActiveFilters =
    filters.search ||
    !!filters.customerSource ||
    (filters.activeFilter !== undefined &&
      filters.activeFilter !== ActiveFilter.ACTIVE_FILTER_UNSPECIFIED)

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <DebouncedSearchInput
        value={filters.search || ""}
        onValueChange={handleSearchChange}
        placeholder="Search code, name, short name..."
        debounceMs={300}
        containerClassName="flex-1 sm:max-w-sm"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={filters.customerSource || ALL_SOURCES} onValueChange={handleSourceChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            {CUSTOMER_SOURCE_OPTIONS.map((option) => (
              <SelectItem key={option.value || ALL_SOURCES} value={option.value || ALL_SOURCES}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
