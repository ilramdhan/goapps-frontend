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
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

import type { Department } from "@/types/iam/department"
import { useCreateDepartment, useUpdateDepartment } from "@/hooks/iam/use-departments"
import { CompanyCombobox } from "@/components/iam/company-combobox"
import { DivisionCombobox } from "@/components/iam/division-combobox"

const baseDepartmentFormFields = {
    companyId: z.string().min(1, "Company is required"),
    divisionId: z.string().min(1, "Division is required"),
    departmentName: z.string().min(1, "Name is required").max(100),
    description: z.string().max(500).optional(),
    isActive: z.boolean(),
}

const createSchema = z.object({
    departmentCode: z.string().min(1, "Code is required").max(20).regex(/^[A-Z][A-Z0-9-]*$/, "Uppercase, digits, hyphen"),
    ...baseDepartmentFormFields,
})

const updateSchema = z.object({
    departmentCode: z.string().min(1, "Code is required"),
    ...baseDepartmentFormFields,
})

type FormValues = z.infer<typeof createSchema>

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    department?: Department | null
    onSuccess?: () => void
}

export function DepartmentFormDialog({ open, onOpenChange, department, onSuccess }: Props) {
    const isEditing = !!department
    const createMutation = useCreateDepartment()
    const updateMutation = useUpdateDepartment()

    const form = useForm<FormValues>({
        resolver: zodResolver(isEditing ? updateSchema : createSchema) as never,
        defaultValues: { companyId: "", divisionId: "", departmentCode: "", departmentName: "", description: "", isActive: true },
    })

    const companyId = form.watch("companyId")

    useEffect(() => {
        if (open) {
            if (department) {
                form.reset({
                    companyId: department.division?.companyId || "",
                    divisionId: department.divisionId || "",
                    departmentCode: department.departmentCode || "",
                    departmentName: department.departmentName || "",
                    description: department.description || "",
                    isActive: department.isActive ?? true,
                })
            } else {
                form.reset({ companyId: "", divisionId: "", departmentCode: "", departmentName: "", description: "", isActive: true })
            }
        }
    }, [open, department, form])

    const onSubmit = async (values: FormValues) => {
        try {
            if (isEditing && department) {
                await updateMutation.mutateAsync({
                    id: department.departmentId,
                    data: {
                        departmentId: department.departmentId,
                        departmentName: values.departmentName,
                        description: values.description,
                        isActive: values.isActive,
                    },
                })
            } else {
                await createMutation.mutateAsync({
                    divisionId: values.divisionId,
                    departmentCode: values.departmentCode,
                    departmentName: values.departmentName,
                    description: values.description || "",
                })
            }
            onOpenChange(false)
            onSuccess?.()
        } catch (e) {
            console.error("Failed to save department:", e)
        }
    }

    const isPending = createMutation.isPending || updateMutation.isPending

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <ScrollableDialogContent className="sm:max-w-[480px]">
                <ScrollableDialogHeader>
                    <DialogTitle>{isEditing ? "Edit Department" : "Add New Department"}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? "Update department. Code and parent cannot be changed." : "Create a new department."}
                    </DialogDescription>
                </ScrollableDialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col min-h-0">
                        <ScrollableDialogBody className="space-y-4">
                        <FormItem>
                            <FormLabel>Company</FormLabel>
                            <FormControl>
                                <CompanyCombobox
                                    value={companyId}
                                    onValueChange={(v) => {
                                        form.setValue("companyId", v)
                                        form.setValue("divisionId", "")
                                    }}
                                    disabled={isEditing || isPending}
                                />
                            </FormControl>
                        </FormItem>
                        <FormField
                            control={form.control}
                            name="divisionId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Division</FormLabel>
                                    <FormControl>
                                        <DivisionCombobox
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            companyId={companyId || undefined}
                                            disabled={isEditing || isPending || !companyId}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="departmentCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Code</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="e.g., HR"
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
                            name="departmentName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Department name" {...field} value={field.value || ""} disabled={isPending} />
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
                                        <Textarea {...field} value={field.value || ""} disabled={isPending} rows={2} />
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
                                            <FormDescription>Inactive departments hidden in dropdowns</FormDescription>
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
