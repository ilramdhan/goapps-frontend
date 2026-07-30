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
import { MachineGroupCombobox } from "@/components/ppc/comboboxes"

import type { Machine } from "@/types/ppc/master"
import { useUpdateMachine } from "@/hooks/ppc/use-machine"

interface MachineFormValues {
  machineLine: string
  machineGroupId: string
  machineDoffWeightKg: string
  machineOrionCode: string
  machineIsActive: boolean
}

const formSchema = z.object({
  machineLine: z.string().max(50, "Max 50 characters"),
  machineGroupId: z.string(),
  machineDoffWeightKg: z
    .string()
    .refine((v) => v === "" || !Number.isNaN(Number(v)), "Must be a number"),
  machineOrionCode: z.string().max(50, "Max 50 characters"),
  machineIsActive: z.boolean(),
})

interface MachineFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  machine?: Machine | null
}

const NO_GROUP = "0"

export function MachineFormDialog({ open, onOpenChange, machine }: MachineFormDialogProps) {
  const updateMutation = useUpdateMachine()

  const form = useForm<MachineFormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: {
      machineLine: "",
      machineGroupId: NO_GROUP,
      machineDoffWeightKg: "",
      machineOrionCode: "",
      machineIsActive: true,
    },
  })

  useEffect(() => {
    if (open && machine) {
      form.reset({
        machineLine: machine.machineLine || "",
        machineGroupId: String(machine.machineGroupId || 0),
        machineDoffWeightKg: machine.machineDoffWeightKg || "",
        machineOrionCode: machine.machineOrionCode || "",
        machineIsActive: machine.machineIsActive ?? true,
      })
    }
  }, [open, machine, form])

  const onSubmit = async (values: MachineFormValues) => {
    if (!machine) return
    try {
      await updateMutation.mutateAsync({
        id: machine.machineId,
        data: {
          machineId: machine.machineId,
          machineLine: values.machineLine,
          machineGroupId: Number(values.machineGroupId) || 0,
          machineDoffWeightKg: values.machineDoffWeightKg || "0",
          machineOrionCode: values.machineOrionCode,
          machineIsActive: values.machineIsActive,
        },
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to update machine:", error)
    }
  }

  const isPending = updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Machine {machine?.machineNo ? `— ${machine.machineNo}` : ""}</DialogTitle>
          <DialogDescription>
            Machine identity is sync-sourced from Oracle. Only planning fields are editable here.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="machineLine"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Line</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Line A"
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
              name="machineGroupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Machine Group</FormLabel>
                  <FormControl>
                    <MachineGroupCombobox
                      value={field.value && field.value !== NO_GROUP ? Number(field.value) : undefined}
                      onChange={(id) => field.onChange(String(id))}
                      placeholder="Unassigned"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormDescription>Leave unset to keep the machine unassigned.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="machineDoffWeightKg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Doff Weight (kg)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      placeholder="e.g., 12.5"
                      {...field}
                      value={field.value || ""}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormDescription>Standard doff weight used in planning.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="machineOrionCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Orion Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Optional — code in Orion"
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
              name="machineIsActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <FormDescription>Inactive machines are excluded from planning.</FormDescription>
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
                Update
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
