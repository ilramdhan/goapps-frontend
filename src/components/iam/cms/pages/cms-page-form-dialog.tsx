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

import type { CMSPage } from "@/types/iam/cms-page"
import { useCreateCMSPage, useUpdateCMSPage } from "@/hooks/iam/use-cms-page"

interface CMSPageFormValues {
  pageSlug: string
  pageTitle: string
  pageContent: string
  metaDescription: string
  isPublished: boolean
  sortOrder: number
}

const sharedCmsPageFields = {
  pageTitle: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  pageContent: z.string(),
  metaDescription: z.string().max(500, "Meta description must be at most 500 characters"),
  isPublished: z.boolean(),
  sortOrder: z.coerce.number().int().min(0),
}

// Create: pageSlug is user-entered, so the strict format rule still applies.
const createFormSchema = z.object({
  pageSlug: z
    .string()
    .min(1, "Slug is required")
    .max(100, "Slug must be at most 100 characters")
    .regex(
      /^[a-z][a-z0-9-]*$/,
      "Slug must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens"
    ),
  ...sharedCmsPageFields,
})

// Update: pageSlug is read-only/disabled and never sent to the API (see
// onSubmit), so it must not be re-validated against the create-time regex —
// otherwise saving legacy data that predates the format rule would be
// blocked. Still required as a non-empty string so the form/type stays sane.
const updateFormSchema = z.object({
  pageSlug: z.string().min(1),
  ...sharedCmsPageFields,
})

interface CMSPageFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  page?: CMSPage | null
  onSuccess?: () => void
}

export function CMSPageFormDialog({
  open,
  onOpenChange,
  page,
  onSuccess,
}: CMSPageFormDialogProps) {
  const isEditing = !!page
  const createMutation = useCreateCMSPage()
  const updateMutation = useUpdateCMSPage()

  const form = useForm<CMSPageFormValues>({
    // Resolver is re-evaluated every render, so switching schema when
    // `isEditing` flips picks up the right rules immediately.
    resolver: zodResolver(isEditing ? updateFormSchema : createFormSchema) as never,
    defaultValues: {
      pageSlug: "",
      pageTitle: "",
      pageContent: "",
      metaDescription: "",
      isPublished: false,
      sortOrder: 0,
    },
  })

  useEffect(() => {
    if (open) {
      if (page) {
        form.reset({
          pageSlug: page.pageSlug || "",
          pageTitle: page.pageTitle || "",
          pageContent: page.pageContent || "",
          metaDescription: page.metaDescription || "",
          isPublished: page.isPublished ?? false,
          sortOrder: page.sortOrder ?? 0,
        })
      } else {
        form.reset({
          pageSlug: "",
          pageTitle: "",
          pageContent: "",
          metaDescription: "",
          isPublished: false,
          sortOrder: 0,
        })
      }
    }
  }, [open, page, form])

  const onSubmit = async (values: CMSPageFormValues) => {
    try {
      if (isEditing && page) {
        await updateMutation.mutateAsync({
          id: page.pageId,
          data: {
            pageId: page.pageId,
            pageTitle: values.pageTitle,
            pageContent: values.pageContent,
            metaDescription: values.metaDescription,
            isPublished: values.isPublished,
            sortOrder: values.sortOrder,
          },
        })
      } else {
        await createMutation.mutateAsync({
          pageSlug: values.pageSlug,
          pageTitle: values.pageTitle,
          pageContent: values.pageContent,
          metaDescription: values.metaDescription,
          isPublished: values.isPublished,
          sortOrder: values.sortOrder,
        })
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Failed to save CMS Page:", error)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Page" : "Add New Page"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the page details. Slug cannot be changed."
              : "Create a new CMS page (e.g., Privacy Policy, Terms of Service)."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="pageSlug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., privacy, terms, about"
                      {...field}
                      value={field.value || ""}
                      disabled={isEditing || isPending}
                      onChange={(e) =>
                        field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    URL-friendly identifier (lowercase, hyphens only)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pageTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Privacy Policy"
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
              name="pageContent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Page content (Markdown/HTML supported)..."
                      {...field}
                      value={field.value || ""}
                      disabled={isPending}
                      rows={8}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="metaDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Short description for SEO..."
                      {...field}
                      value={field.value || ""}
                      disabled={isPending}
                      rows={2}
                    />
                  </FormControl>
                  <FormDescription>Max 500 characters</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPublished"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 flex-1">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Published</FormLabel>
                      <FormDescription>
                        Make this page publicly visible
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                        disabled={isPending}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

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
