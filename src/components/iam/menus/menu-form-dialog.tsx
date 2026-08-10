"use client"

import { useEffect } from "react"
import { useForm, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

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
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { IconPicker } from "@/components/common/icon-picker"

import { useCreateMenu, useUpdateMenu } from "@/hooks/iam/use-menu"
import { type NormalizedMenuWithChildren, MenuLevel } from "@/types/iam/menu"

// ---------------------------------------------------------------------------
// Zod schemas + inferred types
// ---------------------------------------------------------------------------

const createSchema = z.object({
    menuCode:    z.string().min(1, "Code is required").max(50),
    menuTitle:   z.string().min(1, "Title is required").max(100),
    menuUrl:     z.string().max(255).optional(),
    iconName:    z.string().max(50).optional(),
    serviceName: z.string().min(1, "Service name is required").max(50),
    menuLevel:   z.nativeEnum(MenuLevel),
    sortOrder:   z.number().int().min(0).optional(),
    isVisible:   z.boolean(),
})

const updateSchema = z.object({
    menuTitle: z.string().min(1).max(100).optional(),
    menuUrl:   z.string().max(255).optional(),
    iconName:  z.string().max(50).optional(),
    sortOrder: z.number().int().min(0).optional(),
    isVisible: z.boolean().optional(),
    isActive:  z.boolean().optional(),
})

export type CreateFormValues = z.infer<typeof createSchema>
export type UpdateFormValues = z.infer<typeof updateSchema>

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MenuFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    /** When editing, the existing menu. */
    menu?: NormalizedMenuWithChildren | null
    /** When set, we're adding a child to this parent (create mode with preset parent). */
    parentMenu?: NormalizedMenuWithChildren | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MenuFormDialog({ open, onOpenChange, menu, parentMenu }: MenuFormDialogProps) {
    const isEditing = !!menu && !parentMenu
    const createMenu = useCreateMenu()
    const updateMenu = useUpdateMenu()

    const defaultLevel = parentMenu
        ? parentMenu.menuLevel + 1
        : isEditing
            ? menu!.menuLevel
            : MenuLevel.ROOT

    const createForm = useForm<CreateFormValues>({
        resolver: zodResolver(createSchema),
        defaultValues: {
            menuCode:    "",
            menuTitle:   "",
            menuUrl:     "",
            iconName:    "",
            serviceName: parentMenu?.serviceName ?? "",
            menuLevel:   defaultLevel as MenuLevel,
            sortOrder:   undefined,
            isVisible:   true,
        },
    })

    const updateForm = useForm<UpdateFormValues>({
        resolver: zodResolver(updateSchema),
        defaultValues: {
            menuTitle: "",
            menuUrl:   "",
            iconName:  "",
            sortOrder: undefined,
            isVisible: true,
            isActive:  true,
        },
    })

    useEffect(() => {
        if (!open) return
        if (isEditing && menu) {
            updateForm.reset({
                menuTitle: menu.menuTitle,
                menuUrl:   menu.menuUrl ?? "",
                iconName:  menu.iconName,
                sortOrder: menu.sortOrder,
                isVisible: menu.isVisible,
                isActive:  menu.isActive,
            })
        } else {
            createForm.reset({
                menuCode:    "",
                menuTitle:   "",
                menuUrl:     "",
                iconName:    "",
                serviceName: parentMenu?.serviceName ?? "",
                menuLevel:   (parentMenu ? parentMenu.menuLevel + 1 : MenuLevel.ROOT) as MenuLevel,
                sortOrder:   undefined,
                isVisible:   true,
            })
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, isEditing])

    const isPending = createMenu.isPending || updateMenu.isPending

    async function onCreateSubmit(values: CreateFormValues) {
        await createMenu.mutateAsync({
            parentId:    parentMenu?.menuId ?? null,
            menuCode:    values.menuCode.toUpperCase(),
            menuTitle:   values.menuTitle,
            menuUrl:     values.menuUrl || null,
            iconName:    values.iconName ?? "",
            serviceName: values.serviceName,
            menuLevel:   values.menuLevel,
            sortOrder:   values.sortOrder,
            isVisible:   values.isVisible,
        })
        onOpenChange(false)
    }

    async function onUpdateSubmit(values: UpdateFormValues) {
        await updateMenu.mutateAsync({
            menuId: menu!.menuId,
            data:   {
                menuTitle: values.menuTitle,
                menuUrl:   values.menuUrl || null,
                iconName:  values.iconName,
                sortOrder: values.sortOrder,
                isVisible: values.isVisible,
                isActive:  values.isActive,
            },
        })
        onOpenChange(false)
    }

    const title = isEditing
        ? `Edit "${menu!.menuTitle}"`
        : parentMenu
            ? `Add child to "${parentMenu.menuTitle}"`
            : "Create Root Menu"

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Update the menu title, URL, icon, sort order, and visibility."
                            : "Fill in the details for the new menu item."}
                    </DialogDescription>
                </DialogHeader>

                {isEditing ? (
                    <Form {...updateForm}>
                        <form onSubmit={updateForm.handleSubmit(onUpdateSubmit)} className="space-y-4">
                            <UpdateFormFields form={updateForm} />
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isPending}>
                                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                ) : (
                    <Form {...createForm}>
                        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                            <CreateFormFields form={createForm} />
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isPending}>
                                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Menu
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    )
}

// ---------------------------------------------------------------------------
// Sub-form field groups
// ---------------------------------------------------------------------------

function CreateFormFields({ form }: { form: UseFormReturn<CreateFormValues> }) {
    return (
        <>
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="menuCode"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Menu Code *</FormLabel>
                            <FormControl>
                                <Input placeholder="FINANCE_MASTER" {...field}
                                    onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="menuLevel"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Level *</FormLabel>
                            <Select
                                value={String(field.value)}
                                onValueChange={(v) => field.onChange(Number(v))}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value={String(MenuLevel.ROOT)}>Root</SelectItem>
                                    <SelectItem value={String(MenuLevel.PARENT)}>Parent</SelectItem>
                                    <SelectItem value={String(MenuLevel.CHILD)}>Child</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <FormField
                control={form.control}
                name="menuTitle"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Title *</FormLabel>
                        <FormControl>
                            <Input placeholder="Finance" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="serviceName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Service *</FormLabel>
                            <FormControl>
                                <Input placeholder="finance" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="iconName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Icon Name</FormLabel>
                            <FormControl>
                                <IconPicker value={field.value} onChange={field.onChange} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <FormField
                control={form.control}
                name="menuUrl"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>URL</FormLabel>
                        <FormControl>
                            <Input placeholder="/finance/master/uom" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="sortOrder"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Sort Order</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    min={0}
                                    placeholder="1"
                                    value={field.value ?? ""}
                                    onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="isVisible"
                    render={({ field }) => (
                        <FormItem className="flex flex-col justify-end">
                            <FormLabel>Visible</FormLabel>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </div>
        </>
    )
}

function UpdateFormFields({ form }: { form: UseFormReturn<UpdateFormValues> }) {
    return (
        <>
            <FormField
                control={form.control}
                name="menuTitle"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                            <Input placeholder="Finance" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="iconName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Icon Name</FormLabel>
                            <FormControl>
                                <IconPicker value={field.value} onChange={field.onChange} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="sortOrder"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Sort Order</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    min={0}
                                    value={field.value ?? ""}
                                    onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <FormField
                control={form.control}
                name="menuUrl"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>URL</FormLabel>
                        <FormControl>
                            <Input placeholder="/finance/master/uom" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <div className="flex items-center gap-6">
                <FormField
                    control={form.control}
                    name="isVisible"
                    render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="font-normal">Visible</FormLabel>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="font-normal">Active</FormLabel>
                        </FormItem>
                    )}
                />
            </div>
        </>
    )
}
