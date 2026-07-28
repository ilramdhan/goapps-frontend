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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { MachineGroup } from "@/types/ppc/master"
import { AREA_OPTIONS, AreaCode } from "@/types/ppc/common"
import { useCreateMachineGroup, useUpdateMachineGroup } from "@/hooks/ppc/use-masters"

const AREA_SELECT_OPTIONS = AREA_OPTIONS.filter(
  (o) => o.value !== AreaCode.AREA_CODE_UNSPECIFIED
)

interface MachineGroupFormValues {
  groupName: string
  groupArea: string
}

const formSchema = z.object({
  groupName: z.string().min(1, "Group name is required").max(100, "Max 100 characters"),
  groupArea: z.string().min(1, "Please select an area"),
})

interface MachineGroupFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group?: MachineGroup | null
}

export function MachineGroupFormDialog({ open, onOpenChange, group }: MachineGroupFormDialogProps) {
  const isEditing = !!group
  const createMutation = useCreateMachineGroup()
  const updateMutation = useUpdateMachineGroup()

  const form = useForm<MachineGroupFormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: { groupName: "", groupArea: "" },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        group
          ? { groupName: group.groupName || "", groupArea: String(group.groupArea || "") }
          : { groupName: "", groupArea: "" }
      )
    }
  }, [open, group, form])

  const onSubmit = async (values: MachineGroupFormValues) => {
    try {
      if (isEditing && group) {
        await updateMutation.mutateAsync({
          id: String(group.groupId),
          data: {
            groupId: group.groupId,
            groupName: values.groupName,
            groupArea: Number(values.groupArea) as AreaCode,
          },
        })
      } else {
        await createMutation.mutateAsync({
          groupName: values.groupName,
          groupArea: Number(values.groupArea) as AreaCode,
        })
      }
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save machine group:", error)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Machine Group" : "Add Machine Group"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the machine group details."
              : "Create a new machine group."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="groupName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Group A"
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
              name="groupArea"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Area</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
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
