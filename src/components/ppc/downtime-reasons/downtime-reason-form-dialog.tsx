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

import type { DowntimeReasonMaster } from "@/types/ppc/master"
import { AREA_OPTIONS, AreaCode } from "@/types/ppc/common"
import { useCreateDowntimeReason, useUpdateDowntimeReason } from "@/hooks/ppc/use-masters"

const AREA_SELECT_OPTIONS = AREA_OPTIONS.filter((o) => o.value !== AreaCode.AREA_CODE_UNSPECIFIED)

const CATEGORY_OPTIONS = [
  { value: "IDLE_POSITION", label: "Idle Position" },
  { value: "MACHINE_DOWN", label: "Machine Down" },
  { value: "PRODUCTION_LOSS", label: "Production Loss" },
]

interface DowntimeReasonFormValues {
  area: string
  code: string
  name: string
  category: string
  isExcludeFromEff: boolean
  sortOrder: string
  isActive: boolean
}

const formSchema = z.object({
  area: z.string().min(1, "Please select an area"),
  code: z.string().min(1, "Code is required").max(50, "Max 50 characters"),
  name: z.string().min(1, "Name is required").max(200, "Max 200 characters"),
  category: z.string().min(1, "Please select a category"),
  isExcludeFromEff: z.boolean(),
  sortOrder: z
    .string()
    .refine((v) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 0), "Must be a non-negative integer"),
  isActive: z.boolean(),
})

interface DowntimeReasonFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reason?: DowntimeReasonMaster | null
}

export function DowntimeReasonFormDialog({
  open,
  onOpenChange,
  reason,
}: DowntimeReasonFormDialogProps) {
  const isEditing = !!reason
  const createMutation = useCreateDowntimeReason()
  const updateMutation = useUpdateDowntimeReason()

  const form = useForm<DowntimeReasonFormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: {
      area: "",
      code: "",
      name: "",
      category: "",
      isExcludeFromEff: false,
      sortOrder: "0",
      isActive: true,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        reason
          ? {
              area: String(reason.area || ""),
              code: reason.code || "",
              name: reason.name || "",
              category: reason.category || "",
              isExcludeFromEff: reason.isExcludeFromEff ?? false,
              sortOrder: String(reason.sortOrder ?? 0),
              isActive: reason.isActive ?? true,
            }
          : {
              area: "",
              code: "",
              name: "",
              category: "",
              isExcludeFromEff: false,
              sortOrder: "0",
              isActive: true,
            }
      )
    }
  }, [open, reason, form])

  const onSubmit = async (values: DowntimeReasonFormValues) => {
    try {
      if (isEditing && reason) {
        await updateMutation.mutateAsync({
          id: String(reason.reasonId),
          data: {
            reasonId: reason.reasonId,
            name: values.name,
            category: values.category,
            isExcludeFromEff: values.isExcludeFromEff,
            isActive: values.isActive,
            sortOrder: values.sortOrder === "" ? 0 : Number(values.sortOrder),
          },
        })
      } else {
        await createMutation.mutateAsync({
          area: Number(values.area) as AreaCode,
          code: values.code,
          name: values.name,
          category: values.category,
          isExcludeFromEff: values.isExcludeFromEff,
          sortOrder: values.sortOrder === "" ? 0 : Number(values.sortOrder),
        })
      }
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save downtime reason:", error)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Downtime Reason" : "Add Downtime Reason"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the downtime reason. Area and code cannot be changed."
              : "Create a new downtime reason."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((option) => (
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
            </div>

            <FormField
              control={form.control}
              name="isExcludeFromEff"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Exclude from Efficiency</FormLabel>
                    <FormDescription>Exclude this downtime from efficiency calculation.</FormDescription>
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

            {isEditing && (
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>Inactive reasons are not selectable.</FormDescription>
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
