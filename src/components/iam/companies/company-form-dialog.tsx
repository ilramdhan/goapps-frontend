"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog"
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

import type { Company } from "@/types/iam/company"
import { useCreateCompany, useUpdateCompany } from "@/hooks/iam/use-company"

const baseCompanyFormFields = {
    companyName: z.string().min(1, "Name is required").max(100),
    description: z.string().max(500).optional(),
    isActive: z.boolean(),
}

const createSchema = z.object({
    companyCode: z
        .string()
        .min(1, "Code is required")
        .max(20, "Max 20 characters")
        .regex(/^[A-Z][A-Z0-9-]*$/, "Uppercase letters, digits, hyphen"),
    ...baseCompanyFormFields,
})

const updateSchema = z.object({
    companyCode: z.string().min(1, "Code is required"),
    ...baseCompanyFormFields,
})

type FormValues = z.infer<typeof createSchema>

interface CompanyFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    company?: Company | null
    onSuccess?: () => void
}

export function CompanyFormDialog({ open, onOpenChange, company, onSuccess }: CompanyFormDialogProps) {
    const isEditing = !!company
    const createMutation = useCreateCompany()
    const updateMutation = useUpdateCompany()

    const form = useForm<FormValues>({
        resolver: zodResolver(isEditing ? updateSchema : createSchema) as never,
        defaultValues: { companyCode: "", companyName: "", description: "", isActive: true },
    })

    useEffect(() => {
        if (open) {
            if (company) {
                form.reset({
                    companyCode: company.companyCode || "",
                    companyName: company.companyName || "",
                    description: company.description || "",
                    isActive: company.isActive ?? true,
                })
            } else {
                form.reset({ companyCode: "", companyName: "", description: "", isActive: true })
            }
        }
    }, [open, company, form])

    const onSubmit = async (values: FormValues) => {
        try {
            if (isEditing && company) {
                await updateMutation.mutateAsync({
                    id: company.companyId,
                    data: {
                        companyId: company.companyId,
                        companyName: values.companyName,
                        description: values.description,
                        isActive: values.isActive,
                    },
                })
            } else {
                await createMutation.mutateAsync({
                    companyCode: values.companyCode,
                    companyName: values.companyName,
                    description: values.description || "",
                })
            }
            onOpenChange(false)
            onSuccess?.()
        } catch (error) {
            console.error("Failed to save company:", error)
        }
    }

    const isPending = createMutation.isPending || updateMutation.isPending

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <ScrollableDialogContent className="sm:max-w-[480px]">
                <ScrollableDialogHeader>
                    <DialogTitle>{isEditing ? "Edit Company" : "Add New Company"}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? "Update company details. Code cannot be changed." : "Create a new company."}
                    </DialogDescription>
                </ScrollableDialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col min-h-0">
                        <ScrollableDialogBody className="space-y-4">
                        <FormField
                            control={form.control}
                            name="companyCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Code</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="e.g., MTG"
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
                            name="companyName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Company name" {...field} value={field.value || ""} disabled={isPending} />
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
                                            <FormDescription>Inactive companies are hidden in dropdowns</FormDescription>
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
