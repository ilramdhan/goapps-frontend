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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

import type { UOM } from "@/types/finance/uom"
import { ActiveFilter } from "@/types/finance/uom"
import { useCreateUOM, useUpdateUOM } from "@/hooks/finance/use-uom"
import { useUOMCategories } from "@/hooks/finance/use-uom-category"

// Form values interface
interface UOMFormValues {
  uomCode: string
  uomName: string
  uomCategoryId: string
  description: string
  isActive: boolean
}

const sharedUomFields = {
  uomName: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  uomCategoryId: z
    .string()
    .min(1, "Please select a category"),
  description: z.string().max(500, "Description must be at most 500 characters"),
  isActive: z.boolean(),
}

// Create: uomCode is user-entered, so the strict format rule still applies.
const createFormSchema = z.object({
  uomCode: z
    .string()
    .min(1, "Code is required")
    .max(20, "Code must be at most 20 characters")
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      "Code must start with uppercase letter and contain only uppercase letters, numbers, and underscores"
    ),
  ...sharedUomFields,
})

// Update: uomCode is read-only/disabled and never sent to the API (see
// onSubmit), so it must not be re-validated against the create-time regex —
// otherwise saving legacy data that predates the format rule would be
// blocked. Still required as a non-empty string so the form/type stays sane.
const updateFormSchema = z.object({
  uomCode: z.string().min(1),
  ...sharedUomFields,
})

interface UOMFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  uom?: UOM | null
  onSuccess?: () => void
}

export function UOMFormDialog({
  open,
  onOpenChange,
  uom,
  onSuccess,
}: UOMFormDialogProps) {
  const isEditing = !!uom
  const createMutation = useCreateUOM()
  const updateMutation = useUpdateUOM()

  // Fetch active categories for create mode, but include inactive categories in edit mode
  // so an existing UOM can still display and retain its currently selected category.
  const { data: categoriesData } = useUOMCategories({
    page: 1,
    pageSize: 100,
    ...(!isEditing ? { activeFilter: ActiveFilter.ACTIVE_FILTER_ACTIVE } : {}),
    sortBy: "name",
    sortOrder: "asc",
  })

  const categoryOptions = categoriesData?.data || []

  const form = useForm<UOMFormValues>({
    // Resolver is re-evaluated every render, so switching schema when
    // `isEditing` flips picks up the right rules immediately.
    resolver: zodResolver(isEditing ? updateFormSchema : createFormSchema) as never,
    defaultValues: {
      uomCode: "",
      uomName: "",
      uomCategoryId: "",
      description: "",
      isActive: true,
    },
  })

  // Reset form when dialog opens/closes or uom changes
  useEffect(() => {
    if (open) {
      if (uom) {
        form.reset({
          uomCode: uom.uomCode || "",
          uomName: uom.uomName || "",
          uomCategoryId: uom.uomCategoryId || "",
          description: uom.description || "",
          isActive: uom.isActive ?? true,
        })
      } else {
        form.reset({
          uomCode: "",
          uomName: "",
          uomCategoryId: "",
          description: "",
          isActive: true,
        })
      }
    }
  }, [open, uom, form])

  const onSubmit = async (values: UOMFormValues) => {
    try {
      if (isEditing && uom) {
        await updateMutation.mutateAsync({
          id: uom.uomId,
          data: {
            uomId: uom.uomId,
            uomName: values.uomName,
            uomCategoryId: values.uomCategoryId,
            description: values.description || "",
            isActive: values.isActive,
          },
        })
      } else {
        await createMutation.mutateAsync({
          uomCode: values.uomCode,
          uomName: values.uomName,
          uomCategoryId: values.uomCategoryId,
          description: values.description || "",
        })
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Failed to save UOM:", error)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit UOM" : "Add New UOM"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the unit of measure details. Code cannot be changed."
              : "Create a new unit of measure for costing calculations."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="uomCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., KG, MTR, PCS"
                      {...field}
                      value={field.value || ""}
                      disabled={isEditing || isPending}
                      className="uppercase"
                      onChange={(e) =>
                        field.onChange(e.target.value.toUpperCase())
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Unique code (1-20 chars, uppercase, starts with letter)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="uomName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Kilogram, Meter, Pieces"
                      {...field}
                      value={field.value || ""}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormDescription>Display name (1-100 chars)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="uomCategoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoryOptions.map((cat) => (
                        <SelectItem key={cat.uomCategoryId} value={cat.uomCategoryId}>
                          {cat.categoryName} ({cat.categoryCode})
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
                  <FormDescription>
                    Optional description (max 500 chars)
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
                      <FormDescription>
                        Inactive UOMs will not be available for selection
                      </FormDescription>
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
