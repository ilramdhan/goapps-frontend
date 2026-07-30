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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MachineCombobox } from "@/components/ppc/comboboxes"

import type { WorkOrder } from "@/types/ppc/work-order"
import { WORefType, WO_REF_TYPE_LABELS } from "@/types/ppc/common"
import { useCreateWOReference } from "@/hooks/ppc/use-work-order"

const schema = z.object({
  refType: z.number().min(1, "Reference type is required"),
  lotNo: z.string().min(1, "Lot number is required").max(50),
  qtyTarget: z.string().min(1, "Target quantity is required"),
  deadline: z.string().min(1, "Deadline is required"),
  machineId: z.coerce.number().optional(),
})
type FormValues = z.infer<typeof schema>

interface WOReferenceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workOrder: WorkOrder
}

const REF_TYPE_OPTIONS = [
  { value: WORefType.WO_REF_TYPE_TEMPLATE, label: WO_REF_TYPE_LABELS[WORefType.WO_REF_TYPE_TEMPLATE] },
  {
    value: WORefType.WO_REF_TYPE_CONTINUATION,
    label: WO_REF_TYPE_LABELS[WORefType.WO_REF_TYPE_CONTINUATION],
  },
]

export function WOReferenceDialog({ open, onOpenChange, workOrder }: WOReferenceDialogProps) {
  const createMutation = useCreateWOReference()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      refType: WORefType.WO_REF_TYPE_TEMPLATE,
      lotNo: "",
      qtyTarget: workOrder.qtyTarget || "",
      deadline: "",
      machineId: undefined,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        refType: WORefType.WO_REF_TYPE_TEMPLATE,
        lotNo: "",
        qtyTarget: workOrder.qtyTarget || "",
        deadline: "",
        machineId: undefined,
      })
    }
  }, [open, workOrder, form])

  const onSubmit = async (values: FormValues) => {
    try {
      await createMutation.mutateAsync({
        sourceWoId: workOrder.woId,
        refType: values.refType as WORefType,
        lotNo: values.lotNo,
        qtyTarget: values.qtyTarget,
        deadline: values.deadline,
        machineId: values.machineId || undefined,
      })
      onOpenChange(false)
    } catch (e) {
      console.error("Failed to create reference work order:", e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create Reference Work Order</DialogTitle>
          <DialogDescription>
            Create a new WO from {workOrder.woNo} (duplicate template or continuation).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="refType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Reference Type <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                    disabled={createMutation.isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {REF_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={String(o.value)}>
                          {o.label}
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
              name="lotNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Lot Number <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} disabled={createMutation.isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 [&>*]:min-w-0">
              <FormField
                control={form.control}
                name="qtyTarget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Target Qty (kg) <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} disabled={createMutation.isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Deadline <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} disabled={createMutation.isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="machineId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Machine</FormLabel>
                  <FormControl>
                    <MachineCombobox
                      value={field.value ? Number(field.value) : undefined}
                      onChange={(id) => field.onChange(id)}
                      disabled={createMutation.isPending}
                    />
                  </FormControl>
                  <FormDescription>Optional — defaults to the source WO&apos;s machine.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Reference
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
