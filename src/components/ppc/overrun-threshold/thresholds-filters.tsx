"use client"

import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { ListOverrunThresholdConfigsParams } from "@/types/ppc/master"
import {
  THRESHOLD_LEVEL_OPTIONS,
  ACTIVE_FILTER_OPTIONS,
  ThresholdLevel,
  ActiveFilter,
} from "@/types/ppc/common"

interface ThresholdsFiltersProps {
  filters: ListOverrunThresholdConfigsParams
  onFiltersChange: (filters: ListOverrunThresholdConfigsParams) => void
}

export function ThresholdsFilters({ filters, onFiltersChange }: ThresholdsFiltersProps) {
  const handleLevelChange = (value: string) => {
    onFiltersChange({ ...filters, level: Number(value) as ThresholdLevel, page: 1 })
  }

  const handleActiveFilterChange = (value: string) => {
    onFiltersChange({ ...filters, activeFilter: Number(value) as ActiveFilter, page: 1 })
  }

  const handleClearFilters = () => {
    onFiltersChange({
      page: 1,
      pageSize: filters.pageSize,
      level: ThresholdLevel.THRESHOLD_LEVEL_UNSPECIFIED,
      activeFilter: ActiveFilter.ACTIVE_FILTER_UNSPECIFIED,
    })
  }

  const hasActiveFilters =
    (filters.level !== undefined && filters.level !== ThresholdLevel.THRESHOLD_LEVEL_UNSPECIFIED) ||
    (filters.activeFilter !== undefined &&
      filters.activeFilter !== ActiveFilter.ACTIVE_FILTER_UNSPECIFIED)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={String(filters.level ?? ThresholdLevel.THRESHOLD_LEVEL_UNSPECIFIED)}
        onValueChange={handleLevelChange}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Level" />
        </SelectTrigger>
        <SelectContent>
          {THRESHOLD_LEVEL_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={String(option.value)}>
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
  )
}
