"use client"

import { useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Image from "next/image"
import { Loader2, Upload, X } from "lucide-react"

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
import { IconPicker } from "@/components/common/icon-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { CMSSection } from "@/types/iam/cms-section"
import { CMSSectionType, SECTION_TYPE_OPTIONS } from "@/types/iam/cms-section"
import { useCreateCMSSection, useUpdateCMSSection, useUploadCMSImage } from "@/hooks/iam/use-cms-section"

const cmsSectionFormSchema = z.object({
  sectionType: z.coerce.number(),
  sectionKey: z
    .string()
    .min(1, "Key is required")
    .max(100, "Key must be at most 100 characters")
    .regex(
      /^[a-z][a-z0-9_]*$/,
      "Key must start with a lowercase letter and contain only lowercase letters, numbers, and underscores"
    ),
  title: z.string().max(200, "Title must be at most 200 characters"),
  subtitle: z.string().max(500, "Subtitle must be at most 500 characters"),
  content: z.string(),
  iconName: z.string().max(100),
  imageUrl: z.string().max(500),
  buttonText: z.string().max(100),
  buttonUrl: z.string().max(500),
  sortOrder: z.coerce.number().int().min(0),
  isPublished: z.boolean(),
  metadata: z.string(),
})

type CMSSectionFormValues = z.infer<typeof cmsSectionFormSchema>

interface CMSSectionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  section?: CMSSection | null
  onSuccess?: () => void
}

export function CMSSectionFormDialog({
  open,
  onOpenChange,
  section,
  onSuccess,
}: CMSSectionFormDialogProps) {
  const isEditing = !!section
  const createMutation = useCreateCMSSection()
  const updateMutation = useUpdateCMSSection()
  const uploadMutation = useUploadCMSImage()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<CMSSectionFormValues>({
    resolver: zodResolver(cmsSectionFormSchema) as never,
    defaultValues: {
      sectionType: CMSSectionType.CMS_SECTION_TYPE_CUSTOM,
      sectionKey: "",
      title: "",
      subtitle: "",
      content: "",
      iconName: "",
      imageUrl: "",
      buttonText: "",
      buttonUrl: "",
      sortOrder: 0,
      isPublished: false,
      metadata: "{}",
    },
  })

  useEffect(() => {
    if (open) {
      if (section) {
        form.reset({
          sectionType: section.sectionType ?? CMSSectionType.CMS_SECTION_TYPE_CUSTOM,
          sectionKey: section.sectionKey || "",
          title: section.title || "",
          subtitle: section.subtitle || "",
          content: section.content || "",
          iconName: section.iconName || "",
          imageUrl: section.imageUrl || "",
          buttonText: section.buttonText || "",
          buttonUrl: section.buttonUrl || "",
          sortOrder: section.sortOrder ?? 0,
          isPublished: section.isPublished ?? false,
          metadata: section.metadata || "{}",
        })
      } else {
        form.reset({
          sectionType: CMSSectionType.CMS_SECTION_TYPE_CUSTOM,
          sectionKey: "",
          title: "",
          subtitle: "",
          content: "",
          iconName: "",
          imageUrl: "",
          buttonText: "",
          buttonUrl: "",
          sortOrder: 0,
          isPublished: false,
          metadata: "{}",
        })
      }
    }
  }, [open, section, form])

  const imageUrl = form.watch("imageUrl")

  const handleImageUpload = async (file: File) => {
    try {
      const result = await uploadMutation.mutateAsync({ file, folder: "sections" })
      form.setValue("imageUrl", result.imageUrl)
    } catch {
      // Error toast handled by mutation
    }
  }

  const handleRemoveImage = () => {
    form.setValue("imageUrl", "")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const onSubmit = async (values: CMSSectionFormValues) => {
    try {
      if (isEditing && section) {
        await updateMutation.mutateAsync({
          id: section.sectionId,
          data: {
            sectionId: section.sectionId,
            sectionType: values.sectionType,
            title: values.title,
            subtitle: values.subtitle,
            content: values.content,
            iconName: values.iconName,
            imageUrl: values.imageUrl,
            buttonText: values.buttonText,
            buttonUrl: values.buttonUrl,
            sortOrder: values.sortOrder,
            isPublished: values.isPublished,
            metadata: values.metadata,
          },
        })
      } else {
        await createMutation.mutateAsync({
          sectionType: values.sectionType,
          sectionKey: values.sectionKey,
          title: values.title,
          subtitle: values.subtitle,
          content: values.content,
          iconName: values.iconName,
          imageUrl: values.imageUrl,
          buttonText: values.buttonText,
          buttonUrl: values.buttonUrl,
          sortOrder: values.sortOrder,
          isPublished: values.isPublished,
          metadata: values.metadata,
        })
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Failed to save CMS Section:", error)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending || uploadMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Section" : "Add New Section"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the section details. Key cannot be changed."
              : "Create a new landing page section."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sectionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SECTION_TYPE_OPTIONS.filter(o => o.value !== CMSSectionType.CMS_SECTION_TYPE_UNSPECIFIED).map((option) => (
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
                name="sectionKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Key</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., landing_hero"
                        {...field}
                        value={field.value || ""}
                        disabled={isEditing || isPending}
                        onChange={(e) =>
                          field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Section title" {...field} value={field.value || ""} disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subtitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subtitle</FormLabel>
                  <FormControl>
                    <Input placeholder="Section subtitle" {...field} value={field.value || ""} disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Section content..." {...field} value={field.value || ""} disabled={isPending} rows={4} />
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
                      <IconPicker value={field.value} onChange={field.onChange} disabled={isPending} />
                    </FormControl>
                    <FormDescription>Lucide icon name</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={() => (
                  <FormItem>
                    <FormLabel>Image</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        {imageUrl ? (
                          <div className="relative inline-block">
                            <Image
                              src={imageUrl}
                              alt="Section image"
                              width={80}
                              height={80}
                              className="rounded-md border object-cover"
                              unoptimized
                            />
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              className="absolute -top-2 -right-2 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                              disabled={isPending}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex h-20 w-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground hover:border-primary hover:text-primary"
                            disabled={isPending || uploadMutation.isPending}
                          >
                            {uploadMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <span className="flex items-center gap-1"><Upload className="h-4 w-4" /> Upload image</span>
                            )}
                          </button>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/svg+xml"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleImageUpload(file)
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="buttonText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Button Text</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Get Started" {...field} value={field.value || ""} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="buttonUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Button URL</FormLabel>
                    <FormControl>
                      <Input placeholder="/login or https://..." {...field} value={field.value || ""} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem className="w-24">
                    <FormLabel>Order</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} disabled={isPending} />
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
                      <FormDescription>Show on landing page</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value ?? false} onCheckedChange={field.onChange} disabled={isPending} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

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
