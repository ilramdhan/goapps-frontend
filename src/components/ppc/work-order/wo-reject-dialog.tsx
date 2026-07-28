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
import { Textarea } from "@/components/ui/textarea"

import type { WorkOrder } from "@/types/ppc/work-order"
import { useRejectWO } from "@/hooks/ppc/use-work-order"

const schema = z.object({
  reason: z.string().min(1, "Reason is required").max(500),
})
type FormValues = z.infer<typeof schema>

interface WORejectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workOrder: WorkOrder
}

export function WORejectDialog({ open, onOpenChange, workOrder }: WORejectDialogProps) {
  const rejectMutation = useRejectWO()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: { reason: "" },
  })

  useEffect(() => {
    if (open) form.reset({ reason: "" })
  }, [open, form])

  const onSubmit = async (values: FormValues) => {
    try {
      await rejectMutation.mutateAsync({ woId: workOrder.woId, reason: values.reason })
      onOpenChange(false)
    } catch (e) {
      console.error("Failed to reject work order:", e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Reject Work Order</DialogTitle>
          <DialogDescription>
            Send {workOrder.woNo} back to PPC with a reason. This is audited.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Reason <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder="Explain why this work order is being rejected..."
                      disabled={rejectMutation.isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={rejectMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={rejectMutation.isPending}>
                {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reject
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
