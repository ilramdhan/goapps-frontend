"use client"

import { useCallback } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { DebouncedSearchInput } from "@/components/common"

import type { ListProductPPCConfigsParams } from "@/types/ppc/master"

interface ProductConfigFiltersProps {
  filters: ListProductPPCConfigsParams
  onFiltersChange: (filters: ListProductPPCConfigsParams) => void
}

export function ProductConfigFilters({ filters, onFiltersChange }: ProductConfigFiltersProps) {
  const handleSearchChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, search: value, page: 1 })
    },
    [filters, onFiltersChange]
  )

  const handleClearFilters = () => {
    onFiltersChange({
      page: 1,
      pageSize: filters.pageSize,
      search: "",
      commodityWatchOnly: false,
    })
  }

  const hasActiveFilters = filters.search || filters.commodityWatchOnly

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <DebouncedSearchInput
        value={filters.search || ""}
        onValueChange={handleSearchChange}
        placeholder="Search product code or name..."
        debounceMs={300}
        containerClassName="flex-1 sm:max-w-sm"
      />

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="commodity-watch-only"
            checked={!!filters.commodityWatchOnly}
            onCheckedChange={(checked) =>
              onFiltersChange({ ...filters, commodityWatchOnly: checked, page: 1 })
            }
          />
          <Label htmlFor="commodity-watch-only" className="text-sm">
            Commodity watch only
          </Label>
        </div>

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
