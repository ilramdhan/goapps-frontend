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

import type { Section } from "@/types/iam/section"
import { useCreateSection, useUpdateSection } from "@/hooks/iam/use-section"
import { CompanyCombobox } from "@/components/iam/company-combobox"
import { DivisionCombobox } from "@/components/iam/division-combobox"
import { DepartmentCombobox } from "@/components/iam/department-combobox"

const baseSectionFormFields = {
    companyId: z.string().min(1, "Company is required"),
    divisionId: z.string().min(1, "Division is required"),
    departmentId: z.string().min(1, "Department is required"),
    sectionName: z.string().min(1, "Name is required").max(100),
    description: z.string().max(500).optional(),
    isActive: z.boolean(),
}

const createSchema = z.object({
    sectionCode: z.string().min(1, "Code is required").max(20).regex(/^[A-Z][A-Z0-9-]*$/, "Uppercase, digits, hyphen"),
    ...baseSectionFormFields,
})

const updateSchema = z.object({
    sectionCode: z.string().min(1, "Code is required"),
    ...baseSectionFormFields,
})

type FormValues = z.infer<typeof createSchema>

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    section?: Section | null
    onSuccess?: () => void
}

export function SectionFormDialog({ open, onOpenChange, section, onSuccess }: Props) {
    const isEditing = !!section
    const createMutation = useCreateSection()
    const updateMutation = useUpdateSection()

    const form = useForm<FormValues>({
        resolver: zodResolver(isEditing ? updateSchema : createSchema) as never,
        defaultValues: { companyId: "", divisionId: "", departmentId: "", sectionCode: "", sectionName: "", description: "", isActive: true },
    })

    const companyId = form.watch("companyId")
    const divisionId = form.watch("divisionId")

    useEffect(() => {
        if (open) {
            if (section) {
                form.reset({
                    companyId: section.department?.division?.companyId || "",
                    divisionId: section.department?.divisionId || "",
                    departmentId: section.departmentId,
                    sectionCode: section.sectionCode || "",
                    sectionName: section.sectionName || "",
                    description: section.description || "",
                    isActive: section.isActive ?? true,
                })
            } else {
                form.reset({ companyId: "", divisionId: "", departmentId: "", sectionCode: "", sectionName: "", description: "", isActive: true })
            }
        }
    }, [open, section, form])

    const onSubmit = async (values: FormValues) => {
        try {
            if (isEditing && section) {
                await updateMutation.mutateAsync({
                    id: section.sectionId,
                    data: {
                        sectionId: section.sectionId,
                        sectionName: values.sectionName,
                        description: values.description,
                        isActive: values.isActive,
                    },
                })
            } else {
                await createMutation.mutateAsync({
                    departmentId: values.departmentId,
                    sectionCode: values.sectionCode,
                    sectionName: values.sectionName,
                    description: values.description || "",
                })
            }
            onOpenChange(false)
            onSuccess?.()
        } catch (e) {
            console.error("Failed to save section:", e)
        }
    }

    const isPending = createMutation.isPending || updateMutation.isPending

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <ScrollableDialogContent className="sm:max-w-[480px]">
                <ScrollableDialogHeader>
                    <DialogTitle>{isEditing ? "Edit Section" : "Add New Section"}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? "Update section. Code and parent cannot be changed." : "Create a new section."}
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
                                        form.setValue("departmentId", "")
                                    }}
                                    disabled={isEditing || isPending}
                                />
                            </FormControl>
                        </FormItem>
                        <FormItem>
                            <FormLabel>Division</FormLabel>
                            <FormControl>
                                <DivisionCombobox
                                    value={divisionId}
                                    onValueChange={(v) => {
                                        form.setValue("divisionId", v)
                                        form.setValue("departmentId", "")
                                    }}
                                    companyId={companyId || undefined}
                                    disabled={isEditing || isPending || !companyId}
                                />
                            </FormControl>
                        </FormItem>
                        <FormField
                            control={form.control}
                            name="departmentId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Department</FormLabel>
                                    <FormControl>
                                        <DepartmentCombobox
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            divisionId={divisionId || undefined}
                                            disabled={isEditing || isPending || !divisionId}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="sectionCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Code</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="e.g., SEC1"
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
                            name="sectionName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Section name" {...field} value={field.value || ""} disabled={isPending} />
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
                                            <FormDescription>Inactive sections hidden in dropdowns</FormDescription>
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
