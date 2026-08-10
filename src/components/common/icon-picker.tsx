"use client"

import { useMemo, useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { DynamicIcon } from "lucide-react/dynamic"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { pascalCaseIconNames, pascalToIconName } from "@/types/iam/menu"

const MAX_VISIBLE_RESULTS = 100

interface IconPickerProps {
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

export function IconPicker({
  value,
  onChange,
  disabled,
  placeholder = "Select icon...",
}: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const results = useMemo(() => {
    const query = search.trim().toLowerCase()
    const all = query
      ? pascalCaseIconNames.filter((name) => name.toLowerCase().includes(query))
      : pascalCaseIconNames
    return all.slice(0, MAX_VISIBLE_RESULTS)
  }, [search])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="flex items-center gap-2 truncate">
            {value ? (
              <>
                {pascalToIconName(value) && (
                  <DynamicIcon
                    name={pascalToIconName(value)!}
                    className="h-4 w-4 shrink-0"
                  />
                )}
                <span className="truncate">{value}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search icon name..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No icon found.</CommandEmpty>
            <CommandGroup>
              {results.map((name) => (
                <CommandItem
                  key={name}
                  value={name}
                  onSelect={() => {
                    onChange(name)
                    setOpen(false)
                    setSearch("")
                  }}
                >
                  <DynamicIcon
                    name={pascalToIconName(name)!}
                    className="h-4 w-4 shrink-0"
                  />
                  <span className="truncate">{name}</span>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === name ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
