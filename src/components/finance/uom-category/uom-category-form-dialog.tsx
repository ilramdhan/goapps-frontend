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

import type { UOMCategory } from "@/types/finance/uom-category"
import { useCreateUOMCategory, useUpdateUOMCategory } from "@/hooks/finance/use-uom-category"

interface UOMCategoryFormValues {
  categoryCode: string
  categoryName: string
  description: string
  isActive: boolean
}

// `categoryCode` is the primary key: editable only at creation time. It is
// rendered `disabled` on update and is never included in the update mutation
// payload (see onSubmit), so the update schema must not re-validate its
// format — otherwise saving a legacy/pre-existing code that predates this
// regex would be blocked even though the field's value is never sent.
const categoryCodeFormatSchema = z
  .string()
  .min(1, "Code is required")
  .max(20, "Code must be at most 20 characters")
  .regex(
    /^[A-Z][A-Z0-9_]*$/,
    "Code must start with uppercase letter and contain only uppercase letters, numbers, and underscores"
  )

const sharedUOMCategoryFields = {
  categoryName: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  description: z.string().max(500, "Description must be at most 500 characters"),
  isActive: z.boolean(),
}

// Create: categoryCode is user-entered, so the strict format rule still applies.
const createFormSchema = z.object({
  categoryCode: categoryCodeFormatSchema,
  ...sharedUOMCategoryFields,
})

// Update: categoryCode is read-only/disabled and never sent to the API, so it
// must not be re-validated against the create-time regex.
const updateFormSchema = z.object({
  categoryCode: z.string().min(1),
  ...sharedUOMCategoryFields,
})

interface UOMCategoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  uomCategory?: UOMCategory | null
  onSuccess?: () => void
}

export function UOMCategoryFormDialog({
  open,
  onOpenChange,
  uomCategory,
  onSuccess,
}: UOMCategoryFormDialogProps) {
  const isEditing = !!uomCategory
  const createMutation = useCreateUOMCategory()
  const updateMutation = useUpdateUOMCategory()

  const form = useForm<UOMCategoryFormValues>({
    // Resolver is re-evaluated every render, so switching schema when
    // `isEditing` flips picks up the right rules immediately.
    resolver: zodResolver(isEditing ? updateFormSchema : createFormSchema) as never,
    defaultValues: {
      categoryCode: "",
      categoryName: "",
      description: "",
      isActive: true,
    },
  })

  useEffect(() => {
    if (open) {
      if (uomCategory) {
        form.reset({
          categoryCode: uomCategory.categoryCode || "",
          categoryName: uomCategory.categoryName || "",
          description: uomCategory.description || "",
          isActive: uomCategory.isActive ?? true,
        })
      } else {
        form.reset({
          categoryCode: "",
          categoryName: "",
          description: "",
          isActive: true,
        })
      }
    }
  }, [open, uomCategory, form])

  const onSubmit = async (values: UOMCategoryFormValues) => {
    try {
      if (isEditing && uomCategory) {
        await updateMutation.mutateAsync({
          id: uomCategory.uomCategoryId,
          data: {
            uomCategoryId: uomCategory.uomCategoryId,
            categoryName: values.categoryName,
            description: values.description || "",
            isActive: values.isActive,
          },
        })
      } else {
        await createMutation.mutateAsync({
          categoryCode: values.categoryCode,
          categoryName: values.categoryName,
          description: values.description || "",
        })
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Failed to save UOM Category:", error)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit UOM Category" : "Add New UOM Category"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the UOM category details. Code cannot be changed."
              : "Create a new unit of measure category."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="categoryCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., WEIGHT, LENGTH, VOLUME"
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
              name="categoryName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Weight, Length, Volume"
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
                        Inactive categories will not be available for selection
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
