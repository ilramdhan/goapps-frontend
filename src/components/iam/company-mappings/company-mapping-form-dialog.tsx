"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
    ScrollableDialogContent,
    ScrollableDialogHeader,
    ScrollableDialogBody,
    ScrollableDialogFooter,
} from "@/components/common/scrollable-dialog"
import {
    Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

import type { CompanyMapping } from "@/types/iam/company-mapping"
import { useCreateCompanyMapping, useUpdateCompanyMapping } from "@/hooks/iam/use-company-mapping"
import { CompanyCombobox } from "@/components/iam/company-combobox"
import { DivisionCombobox } from "@/components/iam/division-combobox"
import { DepartmentCombobox } from "@/components/iam/department-combobox"

const baseCompanyMappingFormFields = {
    name: z.string().min(1, "Name is required").max(200),
    companyId: z.string().min(1, "Company is required"),
    divisionId: z.string().min(1, "Division is required"),
    departmentId: z.string().min(1, "Department is required"),
    sectionId: z.string().optional(),
    isActive: z.boolean(),
}

const createSchema = z.object({
    code: z.string().min(1, "Code is required").max(50).regex(/^[A-Z][A-Z0-9-]*$/, "Uppercase, digits, hyphen"),
    ...baseCompanyMappingFormFields,
})

const updateSchema = z.object({
    code: z.string().min(1, "Code is required"),
    ...baseCompanyMappingFormFields,
})

type FormValues = z.infer<typeof createSchema>

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    mapping?: CompanyMapping | null
    onSuccess?: () => void
}

export function CompanyMappingFormDialog({ open, onOpenChange, mapping, onSuccess }: Props) {
    const isEditing = !!mapping
    const createMutation = useCreateCompanyMapping()
    const updateMutation = useUpdateCompanyMapping()
    const form = useForm<FormValues>({
        resolver: zodResolver(isEditing ? updateSchema : createSchema) as never,
        defaultValues: {
            code: "", name: "", companyId: "", divisionId: "", departmentId: "", sectionId: "", isActive: true,
        },
    })

    const companyId = form.watch("companyId")
    const divisionId = form.watch("divisionId")
    const departmentId = form.watch("departmentId")

    useEffect(() => {
        if (open) {
            if (mapping) {
                form.reset({
                    code: mapping.code || "",
                    name: mapping.name || "",
                    companyId: mapping.companyId || "",
                    divisionId: mapping.divisionId || "",
                    departmentId: mapping.departmentId || "",
                    sectionId: mapping.sectionId || "",
                    isActive: mapping.isActive ?? true,
                })
            } else {
                form.reset({ code: "", name: "", companyId: "", divisionId: "", departmentId: "", sectionId: "", isActive: true })
            }
        }
    }, [open, mapping, form])

    const onSubmit = async (values: FormValues) => {
        try {
            if (isEditing && mapping) {
                await updateMutation.mutateAsync({
                    id: mapping.companyMappingId,
                    data: {
                        companyMappingId: mapping.companyMappingId,
                        name: values.name,
                        companyId: values.companyId,
                        divisionId: values.divisionId,
                        departmentId: values.departmentId,
                        sectionId: values.sectionId || undefined,
                        isActive: values.isActive,
                    },
                })
            } else {
                await createMutation.mutateAsync({
                    code: values.code,
                    name: values.name,
                    companyId: values.companyId,
                    divisionId: values.divisionId,
                    departmentId: values.departmentId,
                    sectionId: values.sectionId || undefined,
                })
            }
            onOpenChange(false)
            onSuccess?.()
        } catch (e) {
            console.error("Failed to save mapping:", e)
        }
    }

    const isPending = createMutation.isPending || updateMutation.isPending

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <ScrollableDialogContent className="sm:max-w-[560px]">
                <ScrollableDialogHeader>
                    <DialogTitle>{isEditing ? "Edit Company Mapping" : "Add New Company Mapping"}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? "Update the mapping. Code cannot be changed." : "Create a new mapping. Section is optional."}
                    </DialogDescription>
                </ScrollableDialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col min-h-0">
                        <ScrollableDialogBody className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Code</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g., MTG-FIN-HR"
                                                {...field}
                                                value={field.value || ""}
                                                disabled={isEditing || isPending}
                                                className="uppercase"
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                            />
                                        </FormControl>
                                        <FormDescription>Uppercase, digits, hyphen</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Display name" {...field} value={field.value || ""} disabled={isPending} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="companyId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Company</FormLabel>
                                    <FormControl>
                                        <CompanyCombobox
                                            value={field.value}
                                            onValueChange={(v) => {
                                                field.onChange(v)
                                                form.setValue("divisionId", "")
                                                form.setValue("departmentId", "")
                                                form.setValue("sectionId", "")
                                            }}
                                            disabled={isPending}
                                            initialLabel={mapping?.companyName ? `${mapping.companyCode} — ${mapping.companyName}` : undefined}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="divisionId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Division</FormLabel>
                                    <FormControl>
                                        <DivisionCombobox
                                            value={field.value}
                                            onValueChange={(v) => {
                                                field.onChange(v)
                                                form.setValue("departmentId", "")
                                                form.setValue("sectionId", "")
                                            }}
                                            companyId={companyId || undefined}
                                            disabled={isPending || !companyId}
                                            initialLabel={mapping?.divisionName ? `${mapping.divisionCode} — ${mapping.divisionName}` : undefined}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="departmentId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Department</FormLabel>
                                    <FormControl>
                                        <DepartmentCombobox
                                            value={field.value}
                                            onValueChange={(v) => {
                                                field.onChange(v)
                                                form.setValue("sectionId", "")
                                            }}
                                            divisionId={divisionId || undefined}
                                            disabled={isPending || !divisionId}
                                            initialLabel={mapping?.departmentName ? `${mapping.departmentCode} — ${mapping.departmentName}` : undefined}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Section is optional. Use a plain section combobox via department filter */}
                        <FormField
                            control={form.control}
                            name="sectionId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Section (optional)</FormLabel>
                                    <FormControl>
                                        <SectionByDepartmentCombobox
                                            value={field.value || ""}
                                            onValueChange={field.onChange}
                                            departmentId={departmentId || undefined}
                                            disabled={isPending || !departmentId}
                                            initialLabel={mapping?.sectionName ? `${mapping.sectionCode} — ${mapping.sectionName}` : undefined}
                                        />
                                    </FormControl>
                                    <FormDescription>Leave empty if this mapping has no section</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {isEditing && (
                            <FormField
                                control={form.control}
                                name="isActive"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">Active</FormLabel>
                                            <FormDescription>Inactive mappings hidden in dropdowns</FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value ?? true} onCheckedChange={field.onChange} disabled={isPending} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        )}
                        </ScrollableDialogBody>
                        <ScrollableDialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? "Update" : "Create"}
                            </Button>
                        </ScrollableDialogFooter>
                    </form>
                </Form>
            </ScrollableDialogContent>
        </Dialog>
    )
}

// Lightweight inline section picker using the existing /api/v1/iam/sections route
import { useState as useState2 } from "react"
import { Check, ChevronsUpDown, Loader2 as Loader2Icon, Search, X } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { apiClient } from "@/lib/api"
import { useDebounce } from "@/lib/hooks/use-debounce"
import { cn } from "@/lib/utils"

interface SectionByDepartmentComboboxProps {
    value: string
    onValueChange: (value: string) => void
    departmentId?: string
    disabled?: boolean
    initialLabel?: string
}

interface RawSectionEntry {
    sectionId?: string
    section_id?: string
    sectionCode?: string
    section_code?: string
    sectionName?: string
    section_name?: string
}

function SectionByDepartmentCombobox({ value, onValueChange, departmentId, disabled, initialLabel }: SectionByDepartmentComboboxProps) {
    const [open, setOpen] = useState2(false)
    const [query, setQuery] = useState2("")
    const debounced = useDebounce(query, 300)
    const [selectedLabel, setSelectedLabel] = useState2<string | null>(null)

    const search = useQuery({
        queryKey: ["iam", "sections", "by-department", departmentId || "", debounced],
        enabled: open && !!departmentId,
        queryFn: async () => {
            const qs = new URLSearchParams({
                page: "1",
                pageSize: "50",
                search: debounced,
                activeFilter: "1",
                departmentId: departmentId || "",
            })
            const res = await apiClient.get<{ data?: RawSectionEntry[] }>(`/api/v1/iam/sections?${qs}`)
            return Array.isArray(res.data) ? res.data : []
        },
        staleTime: 30_000,
    })

    const items = search.data || []
    const handlePick = (id: string, label: string) => {
        setSelectedLabel(label)
        onValueChange(id)
        setOpen(false)
    }

    const displayLabel = value ? selectedLabel || initialLabel || "Selected section" : "Select section…"

    return (
        <div className="flex items-center gap-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        disabled={disabled}
                        className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
                    >
                        <span className="truncate">{displayLabel}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[300px] p-0" align="start">
                    <div className="flex items-center gap-2 border-b px-3 py-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search code or name…" className="h-8 border-0 px-0 shadow-none focus-visible:ring-0" />
                    </div>
                    <div className="max-h-64 overflow-y-auto p-1">
                        {search.isFetching && (
                            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> Searching…
                            </div>
                        )}
                        {!search.isFetching && items.length === 0 && (
                            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No sections</p>
                        )}
                        {!search.isFetching && items.map((s) => {
                            const id = s.sectionId || s.section_id || ""
                            const code = s.sectionCode || s.section_code || ""
                            const name = s.sectionName || s.section_name || ""
                            const label = `${code} — ${name}`
                            const isSelected = id === value
                            return (
                                <button
                                    type="button"
                                    key={id}
                                    onClick={() => handlePick(id, label)}
                                    className={cn("flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent", isSelected && "bg-accent")}
                                >
                                    <Check className={cn("mt-0.5 h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                                    <p className="truncate font-medium">{label}</p>
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
                    onClick={() => { setSelectedLabel(null); onValueChange("") }}
                    aria-label="Clear selection"
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    )
}
