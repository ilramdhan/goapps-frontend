"use client"

// Async-search User Combobox.
// Renders a Popover with a search input and a result list. The selected user
// is shown by username — the underlying UUID never appears in the UI.

import { useState } from "react"
import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { apiClient } from "@/lib/api"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { usePresenceStore } from "@/stores/presence-store"
import { cn } from "@/lib/utils"

export interface UserOption {
    id: string
    username: string
    fullName: string
    email: string
}

interface RawUserListEntry {
    user?: {
        userId?: string
        user_id?: string
        username?: string
        email?: string
    }
    detail?: {
        fullName?: string
        full_name?: string
    }
}

interface UserListEnvelope {
    base?: { isSuccess?: boolean; message?: string }
    data?: RawUserListEntry[]
}

function normalize(entry: RawUserListEntry): UserOption {
    const u = entry.user || {}
    const d = entry.detail || {}
    return {
        id: u.userId ?? u.user_id ?? "",
        username: u.username ?? "",
        email: u.email ?? "",
        fullName: d.fullName ?? d.full_name ?? "",
    }
}

interface UserPickerProps {
    value: string
    onChange: (userId: string, user: UserOption | null) => void
    placeholder?: string
    disabled?: boolean
    /** Optional initial display label (e.g. when editing — username already known). */
    initialLabel?: string
    /** Show green online indicator next to each user in the dropdown. */
    showOnlineStatus?: boolean
}

export function UserPicker({
    value,
    onChange,
    placeholder = "Search users…",
    disabled,
    initialLabel,
    showOnlineStatus,
}: UserPickerProps) {
    const isOnline = usePresenceStore((s) => s.isOnline)
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")
    const debounced = useDebounce(query, 300)
    const [selectedRaw, setSelected] = useState<UserOption | null>(null)
    // Drop cached selection if upstream value was cleared
    const selected = value ? selectedRaw : null

    const search = useQuery({
        queryKey: ["iam", "users", "picker", debounced],
        queryFn: async (): Promise<UserOption[]> => {
            const res = await apiClient.get<UserListEnvelope>(
                `/api/v1/iam/users?search=${encodeURIComponent(debounced)}&pageSize=20&page=1`
            )
            if (res.base && res.base.isSuccess === false) {
                throw new Error(res.base.message || "Search failed")
            }
            const list = Array.isArray(res.data) ? res.data : []
            return list.map(normalize).filter((u) => u.id)
        },
        enabled: open,
        staleTime: 30_000,
    })

    const handlePick = (u: UserOption) => {
        setSelected(u)
        onChange(u.id, u)
        setOpen(false)
    }

    const displayLabel = selected
        ? selected.username || selected.email || selected.fullName
        : value
            ? initialLabel || "Selected user"
            : placeholder

    return (
        <div className="flex items-center gap-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        disabled={disabled}
                        className={cn(
                            "w-full justify-between font-normal",
                            !value && "text-muted-foreground"
                        )}
                    >
                        <span className="truncate">{displayLabel}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-[--radix-popover-trigger-width] min-w-[320px] p-0"
                    align="start"
                >
                    <div className="flex items-center gap-2 border-b px-3 py-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by username, name, email…"
                            className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
                        />
                    </div>
                    <div className="max-h-72 overflow-y-auto p-1">
                        {search.isFetching && (
                            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching…
                            </div>
                        )}
                        {!search.isFetching && search.isError && (
                            <p className="px-3 py-4 text-sm text-destructive">
                                {(search.error as Error)?.message || "Search failed"}
                            </p>
                        )}
                        {!search.isFetching && !search.isError && (search.data?.length ?? 0) === 0 && (
                            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                                {debounced ? "No matching users" : "Type to search users"}
                            </p>
                        )}
                        {!search.isFetching &&
                            search.data?.map((u) => {
                                const isSelected = u.id === value
                                return (
                                    <button
                                        type="button"
                                        key={u.id}
                                        onClick={() => handlePick(u)}
                                        className={cn(
                                            "flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                                            isSelected && "bg-accent"
                                        )}
                                    >
                                        <Check
                                            className={cn(
                                                "mt-0.5 h-4 w-4 shrink-0",
                                                isSelected ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-medium flex items-center gap-1.5">
                                                {showOnlineStatus && (
                                                    <span className={cn(
                                                        "inline-block h-2 w-2 rounded-full shrink-0",
                                                        isOnline(u.id) ? "bg-green-500" : "bg-muted-foreground/30"
                                                    )} />
                                                )}
                                                {u.username || "—"}
                                                {u.fullName && (
                                                    <span className="ml-1 font-normal text-muted-foreground">
                                                        · {u.fullName}
                                                    </span>
                                                )}
                                            </p>
                                            {u.email && (
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {u.email}
                                                </p>
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
                    </div>
                </PopoverContent>
            </Popover>
            {value && !disabled && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                        setSelected(null)
                        onChange("", null)
                    }}
                    aria-label="Clear selection"
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    )
}
