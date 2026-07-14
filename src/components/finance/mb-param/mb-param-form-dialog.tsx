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

import type { MbParam } from "@/types/finance/mb-param"
import { MB_PARAM_TYPE_OPTIONS } from "@/types/finance/mb-param"
import { useCreateMbParam, useUpdateMbParam } from "@/hooks/finance/use-mb-param"

const formSchema = z.object({
  code: z.string().min(1, "Code is required").max(20),
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(200).optional(),
  type: z.enum(["SCALAR", "PICKLIST"]),
  defaultValue: z.string().optional(),
  defaultOption: z.string().optional(),
  unit: z.string().max(20).optional(),
  displayOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface MbParamFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  param?: MbParam | null
}

const emptyValues: FormValues = {
  code: "",
  name: "",
  description: "",
  type: "SCALAR",
  defaultValue: "",
  defaultOption: "",
  unit: "",
  displayOrder: 0,
  isActive: true,
}

export function MbParamFormDialog({ open, onOpenChange, param }: MbParamFormDialogProps) {
  const isEditing = !!param
  const createMutation = useCreateMbParam()
  const updateMutation = useUpdateMbParam()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (open) {
      form.reset(
        param
          ? {
              code: param.code,
              name: param.name,
              description: param.description || "",
              type: param.type === "PICKLIST" ? "PICKLIST" : "SCALAR",
              defaultValue: param.defaultValue || "",
              defaultOption: param.defaultOption || "",
              unit: param.unit || "",
              displayOrder: param.displayOrder ?? 0,
              isActive: param.isActive ?? true,
            }
          : emptyValues
      )
    }
  }, [open, param, form])

  const isPending = createMutation.isPending || updateMutation.isPending
  const type = form.watch("type")

  async function onSubmit(values: FormValues) {
    try {
      const data = {
        code: values.code,
        name: values.name,
        description: values.description || "",
        type: values.type,
        defaultValue: values.type === "SCALAR" ? values.defaultValue || "" : "",
        defaultOption: values.type === "PICKLIST" ? values.defaultOption || "" : "",
        unit: values.unit || "",
        displayOrder: values.displayOrder,
        isActive: values.isActive,
      }
      if (isEditing && param) {
        await updateMutation.mutateAsync({ mbpId: param.mbpId, data })
      } else {
        await createMutation.mutateAsync(data)
      }
      onOpenChange(false)
    } catch {
      // toast handled in hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Parameter" : "Add Parameter"}</DialogTitle>
          <DialogDescription>Master parameter used in MB Head recipes.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="mb-param-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., DIP_TIME" disabled={isEditing || isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Dipping Time" disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type <span className="text-destructive">*</span></FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isEditing || isPending}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MB_PARAM_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {type === "SCALAR" ? (
              <FormField
                control={form.control}
                name="defaultValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Value</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., 30" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="defaultOption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Option Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., FINE" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., min" disabled={isPending} />
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
                    <Input {...field} placeholder="Optional" disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="displayOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Order</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="1" min="0" disabled={isPending} />
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
                      <FormLabel>Active</FormLabel>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isPending} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="mb-param-form" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
