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

import type { RMCategory } from "@/types/finance/rm-category"
import { useCreateRMCategory, useUpdateRMCategory } from "@/hooks/finance/use-rm-category"

interface RMCategoryFormValues {
  categoryCode: string
  categoryName: string
  description: string
  isActive: boolean
}

const baseRMCategoryFormFields = {
  categoryName: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  description: z.string().max(500, "Description must be at most 500 characters"),
  isActive: z.boolean(),
}

const createRMCategoryFormSchema = z.object({
  categoryCode: z
    .string()
    .min(1, "Code is required")
    .max(20, "Code must be at most 20 characters")
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      "Code must start with uppercase letter and contain only uppercase letters, numbers, and underscores"
    ),
  ...baseRMCategoryFormFields,
})

const updateRMCategoryFormSchema = z.object({
  categoryCode: z.string().min(1, "Code is required"),
  ...baseRMCategoryFormFields,
})

interface RMCategoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rmCategory?: RMCategory | null
  onSuccess?: () => void
}

export function RMCategoryFormDialog({
  open,
  onOpenChange,
  rmCategory,
  onSuccess,
}: RMCategoryFormDialogProps) {
  const isEditing = !!rmCategory
  const createMutation = useCreateRMCategory()
  const updateMutation = useUpdateRMCategory()

  const form = useForm<RMCategoryFormValues>({
    resolver: zodResolver(isEditing ? updateRMCategoryFormSchema : createRMCategoryFormSchema) as never,
    defaultValues: {
      categoryCode: "",
      categoryName: "",
      description: "",
      isActive: true,
    },
  })

  useEffect(() => {
    if (open) {
      if (rmCategory) {
        form.reset({
          categoryCode: rmCategory.categoryCode || "",
          categoryName: rmCategory.categoryName || "",
          description: rmCategory.description || "",
          isActive: rmCategory.isActive ?? true,
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
  }, [open, rmCategory, form])

  const onSubmit = async (values: RMCategoryFormValues) => {
    try {
      if (isEditing && rmCategory) {
        await updateMutation.mutateAsync({
          id: rmCategory.rmCategoryId,
          data: {
            rmCategoryId: rmCategory.rmCategoryId,
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
      console.error("Failed to save RM Category:", error)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit RM Category" : "Add New RM Category"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the raw material category details. Code cannot be changed."
              : "Create a new raw material category."}
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
                      placeholder="e.g., METAL, PLASTIC, WOOD"
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
                      placeholder="e.g., Metal, Plastic, Wood"
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
