"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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

import type { Role } from "@/types/iam/role"
import { useCreateRole, useUpdateRole } from "@/hooks/iam/use-roles"

const baseRoleFormFields = {
    roleName: z.string().min(1, "Name is required").max(100, "Maximum 100 characters"),
    description: z.string().max(500, "Maximum 500 characters"),
    isActive: z.boolean(),
}

const createRoleFormSchema = z.object({
    roleCode: z
        .string()
        .min(1, "Code is required")
        .max(50, "Maximum 50 characters")
        .regex(/^[A-Z][A-Z0-9_]*$/, "Must be uppercase, start with a letter, only letters, numbers, underscores"),
    ...baseRoleFormFields,
})

const updateRoleFormSchema = z.object({
    roleCode: z.string().min(1, "Code is required"),
    ...baseRoleFormFields,
})

type RoleFormValues = z.infer<typeof createRoleFormSchema>

interface RoleFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    role?: Role | null
    onSuccess?: () => void
}

export function RoleFormDialog({ open, onOpenChange, role, onSuccess }: RoleFormDialogProps) {
    const isEditing = !!role
    const createMutation = useCreateRole()
    const updateMutation = useUpdateRole()

    const form = useForm<RoleFormValues>({
        resolver: zodResolver(isEditing ? updateRoleFormSchema : createRoleFormSchema) as never,
        defaultValues: {
            roleCode: "",
            roleName: "",
            description: "",
            isActive: true,
        },
    })

    useEffect(() => {
        if (open) {
            if (role) {
                form.reset({
                    roleCode: role.roleCode || "",
                    roleName: role.roleName || "",
                    description: role.description || "",
                    isActive: role.isActive ?? true,
                })
            } else {
                form.reset({
                    roleCode: "",
                    roleName: "",
                    description: "",
                    isActive: true,
                })
            }
        }
    }, [open, role, form])

    const onSubmit = async (values: RoleFormValues) => {
        try {
            if (isEditing && role) {
                await updateMutation.mutateAsync({
                    id: role.roleId,
                    data: {
                        roleId: role.roleId,
                        roleName: values.roleName,
                        description: values.description || "",
                        isActive: values.isActive,
                    },
                })
            } else {
                await createMutation.mutateAsync({
                    roleCode: values.roleCode,
                    roleName: values.roleName,
                    description: values.description || "",
                    permissionIds: [],
                })
            }
            onOpenChange(false)
            onSuccess?.()
        } catch (error) {
            console.error("Failed to save role:", error)
        }
    }

    const isPending = createMutation.isPending || updateMutation.isPending

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Role" : "Create New Role"}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Update role details. Code cannot be changed."
                            : "Create a new role for access control."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="roleCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Code</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="e.g., ADMIN, MANAGER"
                                            {...field}
                                            value={field.value || ""}
                                            disabled={isEditing || isPending}
                                            className="uppercase"
                                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                        />
                                    </FormControl>
                                    <FormDescription>Unique code (uppercase, starts with letter)</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="roleName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Administrator, Manager" {...field} value={field.value || ""} disabled={isPending} />
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
                                        <Textarea
                                            placeholder="Optional description..."
                                            {...field}
                                            value={field.value || ""}
                                            disabled={isPending}
                                            rows={3}
                                        />
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
                                            <FormLabel className="text-base">Active Status</FormLabel>
                                            <FormDescription>Inactive roles have no effect on permissions</FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value ?? true}
                                                onCheckedChange={field.onChange}
                                                disabled={isPending}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? "Update" : "Create"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
