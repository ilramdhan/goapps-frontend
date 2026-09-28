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

import type { EmployeeGroup } from "@/types/iam/employee-group"
import {
  useCreateEmployeeGroup,
  useUpdateEmployeeGroup,
} from "@/hooks/iam/use-employee-group"

const baseEmployeeGroupFormFields = {
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  isActive: z.boolean(),
}

const createEmployeeGroupFormSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(20, "Code must be at most 20 characters")
    .regex(
      /^[A-Z][A-Z0-9]*$/,
      "Code must start with an uppercase letter and contain only uppercase letters and numbers"
    ),
  ...baseEmployeeGroupFormFields,
})

const updateEmployeeGroupFormSchema = z.object({
  code: z.string().min(1, "Code is required"),
  ...baseEmployeeGroupFormFields,
})

type EmployeeGroupFormValues = z.infer<typeof createEmployeeGroupFormSchema>

interface EmployeeGroupFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeGroup?: EmployeeGroup | null
  onSuccess?: () => void
}

export function EmployeeGroupFormDialog({
  open,
  onOpenChange,
  employeeGroup,
  onSuccess,
}: EmployeeGroupFormDialogProps) {
  const isEditing = !!employeeGroup
  const createMutation = useCreateEmployeeGroup()
  const updateMutation = useUpdateEmployeeGroup()

  const form = useForm<EmployeeGroupFormValues>({
    resolver: zodResolver(isEditing ? updateEmployeeGroupFormSchema : createEmployeeGroupFormSchema) as never,
    defaultValues: {
      code: "",
      name: "",
      isActive: true,
    },
  })

  useEffect(() => {
    if (open) {
      if (employeeGroup) {
        form.reset({
          code: employeeGroup.code || "",
          name: employeeGroup.name || "",
          isActive: employeeGroup.isActive ?? true,
        })
      } else {
        form.reset({
          code: "",
          name: "",
          isActive: true,
        })
      }
    }
  }, [open, employeeGroup, form])

  const onSubmit = async (values: EmployeeGroupFormValues) => {
    try {
      if (isEditing && employeeGroup) {
        await updateMutation.mutateAsync({
          id: employeeGroup.employeeGroupId,
          data: {
            employeeGroupId: employeeGroup.employeeGroupId,
            name: values.name,
            isActive: values.isActive,
          },
        })
      } else {
        await createMutation.mutateAsync({
          code: values.code,
          name: values.name,
        })
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Failed to save Employee Group:", error)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Employee Group" : "Add New Employee Group"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the employee group details. Code cannot be changed."
              : "Create a new employee group."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., ASM, DYM, MGR"
                        {...field}
                        value={field.value || ""}
                        disabled={isEditing || isPending}
                        className="uppercase"
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                      />
                    </FormControl>
                    <FormDescription>Uppercase letters and digits</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Assembly, Manager"
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
            </div>

            {isEditing && (
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>
                        Inactive groups will not be available for selection
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
