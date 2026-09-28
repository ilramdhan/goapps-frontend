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
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

import type { Division } from "@/types/iam/division"
import { useCreateDivision, useUpdateDivision } from "@/hooks/iam/use-division"
import { CompanyCombobox } from "@/components/iam/company-combobox"

const baseDivisionFormFields = {
    companyId: z.string().min(1, "Company is required"),
    divisionName: z.string().min(1, "Name is required").max(100),
    description: z.string().max(500).optional(),
    isActive: z.boolean(),
}

const createSchema = z.object({
    divisionCode: z.string().min(1, "Code is required").max(20).regex(/^[A-Z][A-Z0-9-]*$/, "Uppercase, digits, hyphen"),
    ...baseDivisionFormFields,
})

const updateSchema = z.object({
    divisionCode: z.string().min(1, "Code is required"),
    ...baseDivisionFormFields,
})

type FormValues = z.infer<typeof createSchema>

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    division?: Division | null
    onSuccess?: () => void
}

export function DivisionFormDialog({ open, onOpenChange, division, onSuccess }: Props) {
    const isEditing = !!division
    const createMutation = useCreateDivision()
    const updateMutation = useUpdateDivision()

    const form = useForm<FormValues>({
        resolver: zodResolver(isEditing ? updateSchema : createSchema) as never,
        defaultValues: { companyId: "", divisionCode: "", divisionName: "", description: "", isActive: true },
    })

    useEffect(() => {
        if (open) {
            if (division) {
                form.reset({
                    companyId: division.companyId || "",
                    divisionCode: division.divisionCode || "",
                    divisionName: division.divisionName || "",
                    description: division.description || "",
                    isActive: division.isActive ?? true,
                })
            } else {
                form.reset({ companyId: "", divisionCode: "", divisionName: "", description: "", isActive: true })
            }
        }
    }, [open, division, form])

    const onSubmit = async (values: FormValues) => {
        try {
            if (isEditing && division) {
                await updateMutation.mutateAsync({
                    id: division.divisionId,
                    data: {
                        divisionId: division.divisionId,
                        divisionName: values.divisionName,
                        description: values.description,
                        isActive: values.isActive,
                    },
                })
            } else {
                await createMutation.mutateAsync({
                    companyId: values.companyId,
                    divisionCode: values.divisionCode,
                    divisionName: values.divisionName,
                    description: values.description || "",
                })
            }
            onOpenChange(false)
            onSuccess?.()
        } catch (error) {
            console.error("Failed to save division:", error)
        }
    }

    const isPending = createMutation.isPending || updateMutation.isPending
    const initialCompanyLabel = division?.company
        ? `${division.company.companyCode} — ${division.company.companyName}`
        : undefined

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <ScrollableDialogContent className="sm:max-w-[480px]">
                <ScrollableDialogHeader>
                    <DialogTitle>{isEditing ? "Edit Division" : "Add New Division"}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? "Update division. Code and company cannot be changed." : "Create a new division."}
                    </DialogDescription>
                </ScrollableDialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col min-h-0">
                        <ScrollableDialogBody className="space-y-4">
                        <FormField
                            control={form.control}
                            name="companyId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Company</FormLabel>
                                    <FormControl>
                                        <CompanyCombobox
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            disabled={isEditing || isPending}
                                            initialLabel={initialCompanyLabel}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="divisionCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Code</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="e.g., FIN"
                                            {...field}
                                            value={field.value || ""}
                                            disabled={isEditing || isPending}
                                            className="uppercase"
                                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                        />
                                    </FormControl>
                                    <FormDescription>Uppercase letters, digits, hyphen</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="divisionName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Division name" {...field} value={field.value || ""} disabled={isPending} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Optional description" {...field} value={field.value || ""} disabled={isPending} rows={2} />
                                    </FormControl>
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
                                            <FormDescription>Inactive divisions hidden in dropdowns</FormDescription>
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
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                                Cancel
                            </Button>
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
