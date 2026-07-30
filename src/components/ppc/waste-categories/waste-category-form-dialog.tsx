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
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { WasteCategoryMaster } from "@/types/ppc/master"
import { AREA_OPTIONS, AreaCode } from "@/types/ppc/common"
import { useCreateWasteCategory, useUpdateWasteCategory } from "@/hooks/ppc/use-masters"

const AREA_SELECT_OPTIONS = AREA_OPTIONS.filter((o) => o.value !== AreaCode.AREA_CODE_UNSPECIFIED)

const TYPE_OPTIONS = [
  { value: "WASTE", label: "Waste" },
  { value: "DOWNGRADE", label: "Downgrade" },
]

interface WasteCategoryFormValues {
  area: string
  type: string
  code: string
  name: string
  gradeTarget: string
  sortOrder: string
  isActive: boolean
}

const formSchema = z.object({
  area: z.string().min(1, "Please select an area"),
  type: z.string().min(1, "Please select a type"),
  code: z.string().min(1, "Code is required").max(50, "Max 50 characters"),
  name: z.string().min(1, "Name is required").max(200, "Max 200 characters"),
  gradeTarget: z.string().max(20, "Max 20 characters"),
  sortOrder: z
    .string()
    .refine((v) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 0), "Must be a non-negative integer"),
  isActive: z.boolean(),
})

interface WasteCategoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: WasteCategoryMaster | null
}

export function WasteCategoryFormDialog({
  open,
  onOpenChange,
  category,
}: WasteCategoryFormDialogProps) {
  const isEditing = !!category
  const createMutation = useCreateWasteCategory()
  const updateMutation = useUpdateWasteCategory()

  const form = useForm<WasteCategoryFormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: {
      area: "",
      type: "",
      code: "",
      name: "",
      gradeTarget: "",
      sortOrder: "0",
      isActive: true,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        category
          ? {
              area: String(category.area || ""),
              type: category.type || "",
              code: category.code || "",
              name: category.name || "",
              gradeTarget: category.gradeTarget || "",
              sortOrder: String(category.sortOrder ?? 0),
              isActive: category.isActive ?? true,
            }
          : {
              area: "",
              type: "",
              code: "",
              name: "",
              gradeTarget: "",
              sortOrder: "0",
              isActive: true,
            }
      )
    }
  }, [open, category, form])

  const onSubmit = async (values: WasteCategoryFormValues) => {
    try {
      if (isEditing && category) {
        await updateMutation.mutateAsync({
          id: String(category.categoryId),
          data: {
            categoryId: category.categoryId,
            name: values.name,
            gradeTarget: values.gradeTarget,
            isActive: values.isActive,
            sortOrder: values.sortOrder === "" ? 0 : Number(values.sortOrder),
          },
        })
      } else {
        await createMutation.mutateAsync({
          area: Number(values.area) as AreaCode,
          type: values.type,
          code: values.code,
          name: values.name,
          gradeTarget: values.gradeTarget,
          sortOrder: values.sortOrder === "" ? 0 : Number(values.sortOrder),
        })
      }
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save waste category:", error)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Waste Category" : "Add Waste Category"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the waste category. Area, type, and code cannot be changed."
              : "Create a new waste category."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 [&>*]:min-w-0">
              <FormField
                control={form.control}
                name="area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isEditing || isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an area" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AREA_SELECT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={String(option.value)}>
                            {option.label}
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
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isEditing || isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 [&>*]:min-w-0">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} disabled={isEditing || isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gradeTarget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade Target</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} disabled={isPending} />
                    </FormControl>
                    <FormDescription>For Downgrade: B / C.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} disabled={isPending} />
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
                    <Input type="number" {...field} value={field.value || ""} disabled={isPending} />
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
                      <FormDescription>Inactive categories are not selectable.</FormDescription>
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
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
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
