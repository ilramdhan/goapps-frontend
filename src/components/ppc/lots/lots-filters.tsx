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

import {
  LOT_PROD_TYPE_OPTIONS,
  LOT_SOURCE_OPTIONS,
  type ListLotMastersParams,
} from "@/types/ppc/master"

// Radix Select rejects "" as an item value, so the "no filter" choice travels
// as a sentinel and is mapped back to "" before it reaches the query params.
const ALL = "ALL"

interface LotsFiltersProps {
  filters: ListLotMastersParams
  onFiltersChange: (filters: ListLotMastersParams) => void
}

export function LotsFilters({ filters, onFiltersChange }: LotsFiltersProps) {
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
      itemCode: "",
      shadeCode: "",
      source: "",
      prodType: "",
    })
  }

  const hasActiveFilters =
    filters.search || filters.itemCode || filters.shadeCode || filters.source || filters.prodType

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <DebouncedSearchInput
        value={filters.search || ""}
        onValueChange={handleSearchChange}
        placeholder="Search lot no..."
        debounceMs={300}
        containerClassName="flex-1 sm:max-w-sm"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={filters.itemCode || ""}
          onChange={(e) => onFiltersChange({ ...filters, itemCode: e.target.value, page: 1 })}
          placeholder="Item code"
          className="w-[140px]"
        />
        <Input
          value={filters.shadeCode || ""}
          onChange={(e) => onFiltersChange({ ...filters, shadeCode: e.target.value, page: 1 })}
          placeholder="Shade code"
          className="w-[140px]"
        />

        <Select
          value={filters.source || ALL}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, source: v === ALL ? "" : v, page: 1 })
          }
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            {LOT_SOURCE_OPTIONS.map((o) => (
              <SelectItem key={o.value || ALL} value={o.value || ALL}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.prodType || ALL}
          onValueChange={(v) =>
            onFiltersChange({ ...filters, prodType: v === ALL ? "" : v, page: 1 })
          }
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {LOT_PROD_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value || ALL} value={o.value || ALL}>
                {o.label}
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
