"use client"

import { useEffect, useRef } from "react"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import type { PermissionDetail } from "@/types/iam/role"
import { useCreatePermission, useUpdatePermission } from "@/hooks/iam/use-permissions"
import { MenuCombobox } from "@/components/settings/rbac/menu-combobox"

const ACTION_TYPES = ["view", "create", "update", "delete", "export", "import"] as const

const basePermissionFormFields = {
    permissionName: z.string().min(1, "Name is required").max(100, "Maximum 100 characters"),
    description: z.string().min(1, "Description is required").max(500, "Maximum 500 characters"),
    serviceName: z.string().min(1, "Service is required").max(50, "Maximum 50 characters"),
    moduleName: z.string().min(1, "Module is required").max(50, "Maximum 50 characters"),
    actionType: z.enum(ACTION_TYPES, { message: "Action type is required" }),
    menuId: z.string(),
    isActive: z.boolean(),
}

const createPermissionFormSchema = z.object({
    permissionCode: z
        .string()
        .min(3, "Minimum 3 characters")
        .max(100, "Maximum 100 characters")
        .regex(
            /^[a-z][a-z0-9]*\.[a-z][a-z0-9]*\.[a-z][a-z0-9]*\.[a-z]+$/,
            "Format: service.module.entity.action (lowercase, dots)"
        ),
    ...basePermissionFormFields,
})

const updatePermissionFormSchema = z.object({
    permissionCode: z.string().min(1, "Code is required"),
    ...basePermissionFormFields,
})

type PermissionFormValues = z.infer<typeof createPermissionFormSchema>

interface PermissionFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    permission?: PermissionDetail | null
}

export function PermissionFormDialog({ open, onOpenChange, permission }: PermissionFormDialogProps) {
    const isEditing = !!permission
    const createMutation = useCreatePermission()
    const updateMutation = useUpdatePermission()

    const form = useForm<PermissionFormValues>({
        resolver: zodResolver(isEditing ? updatePermissionFormSchema : createPermissionFormSchema) as never,
        defaultValues: {
            permissionCode: "",
            permissionName: "",
            description: "",
            serviceName: "",
            moduleName: "",
            actionType: "view",
            menuId: "",
            isActive: true,
        },
    })

    useEffect(() => {
        if (open) {
            if (permission) {
                form.reset({
                    permissionCode: permission.permissionCode || "",
                    permissionName: permission.permissionName || "",
                    description: permission.description || "",
                    serviceName: permission.serviceName || "",
                    moduleName: permission.moduleName || "",
                    actionType: (permission.actionType as typeof ACTION_TYPES[number]) || "view",
                    menuId: permission.menuId || "",
                    isActive: permission.isActive ?? true,
                })
            } else {
                form.reset({
                    permissionCode: "",
                    permissionName: "",
                    description: "",
                    serviceName: "",
                    moduleName: "",
                    actionType: "view",
                    menuId: "",
                    isActive: true,
                })
            }
        }
    }, [open, permission, form])

    // Auto-generate permission code from service + module + action
    const watchService = form.watch("serviceName")
    const watchModule = form.watch("moduleName")
    const watchAction = form.watch("actionType")
    const codeManuallyEdited = useRef(false)

    // Reset manual edit flag when service/module/action changes
    useEffect(() => {
        if (!isEditing) {
            codeManuallyEdited.current = false
        }
    }, [watchService, watchModule, watchAction, isEditing])

    // Auto-generate code: service.module.module.action (entity defaults to module name)
    useEffect(() => {
        if (!isEditing && !codeManuallyEdited.current && watchService && watchModule && watchAction) {
            form.setValue("permissionCode", `${watchService}.${watchModule}.${watchModule}.${watchAction}`)
        }
    }, [watchService, watchModule, watchAction, isEditing, form])

    const onSubmit = async (values: PermissionFormValues) => {
        try {
            if (isEditing && permission) {
                await updateMutation.mutateAsync({
                    id: permission.permissionId,
                    data: {
                        permissionId: permission.permissionId,
                        permissionName: values.permissionName,
                        description: values.description || "",
                        isActive: values.isActive,
                        menuId: values.menuId,
                    },
                })
            } else {
                await createMutation.mutateAsync({
                    permissionCode: values.permissionCode,
                    permissionName: values.permissionName,
                    description: values.description || "",
                    serviceName: values.serviceName,
                    moduleName: values.moduleName,
                    actionType: values.actionType,
                    menuId: values.menuId,
                })
            }
            onOpenChange(false)
        } catch (error) {
            console.error("Failed to save permission:", error)
        }
    }

    const isPending = createMutation.isPending || updateMutation.isPending

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Permission" : "Create New Permission"}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Update permission details. Code cannot be changed."
                            : "Create a new permission for access control."}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="serviceName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Service</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g., iam, finance"
                                                {...field}
                                                value={field.value || ""}
                                                disabled={isEditing || isPending}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="moduleName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Module</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g., user, master"
                                                {...field}
                                                value={field.value || ""}
                                                disabled={isEditing || isPending}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="actionType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Action Type</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        disabled={isEditing || isPending}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select action type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {ACTION_TYPES.map((action) => (
                                                <SelectItem key={action} value={action}>
                                                    {action.charAt(0).toUpperCase() + action.slice(1)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="permissionCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Permission Code</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="e.g., finance.master.uom.view"
                                            {...field}
                                            value={field.value || ""}
                                            disabled={isEditing || isPending}
                                            className="font-mono"
                                            onChange={(e) => {
                                                codeManuallyEdited.current = true
                                                field.onChange(e)
                                            }}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Format: service.module.entity.action (auto-generated, editable)
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="permissionName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Display Name</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="e.g., View UOMs"
                                            {...field}
                                            value={field.value || ""}
                                            disabled={isPending}
                                        />
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
                                    <FormLabel>
                                        Description <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Explain what this permission allows, e.g. 'View the Unit of Measure master list'"
                                            {...field}
                                            value={field.value || ""}
                                            disabled={isPending}
                                            rows={2}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Shown to admins when assigning this permission — describe what it does.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="menuId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Page / Menu</FormLabel>
                                    <FormControl>
                                        <MenuCombobox
                                            value={field.value || ""}
                                            onChange={field.onChange}
                                            disabled={isPending}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        The page this permission belongs to. Choose &quot;Global / none&quot; for
                                        cross-page permissions.
                                    </FormDescription>
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
                                            <FormDescription>Inactive permissions have no effect</FormDescription>
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
