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
import { Switch } from "@/components/ui/switch"

import {
  type EmployeeLevel,
  EmployeeLevelType,
  EmployeeLevelWorkflow,
  EMPLOYEE_LEVEL_TYPE_OPTIONS,
  EMPLOYEE_LEVEL_WORKFLOW_OPTIONS,
} from "@/types/iam/employee-level"
import {
  useCreateEmployeeLevel,
  useUpdateEmployeeLevel,
} from "@/hooks/iam/use-employee-level"

interface EmployeeLevelFormValues {
  code: string
  name: string
  grade: number
  type: EmployeeLevelType
  sequence: number
  workflow: EmployeeLevelWorkflow
  isActive: boolean
}

const baseEmployeeLevelFormFields = {
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  grade: z
    .number()
    .int("Grade must be an integer")
    .min(0, "Grade must be >= 0")
    .max(99, "Grade must be <= 99"),
  type: z
    .number()
    .refine((v) => v !== EmployeeLevelType.EMPLOYEE_LEVEL_TYPE_UNSPECIFIED, {
      message: "Type is required",
    }),
  sequence: z
    .number()
    .int("Sequence must be an integer")
    .min(0, "Sequence must be >= 0")
    .max(999, "Sequence must be <= 999"),
  workflow: z
    .number()
    .refine(
      (v) => v !== EmployeeLevelWorkflow.EMPLOYEE_LEVEL_WORKFLOW_UNSPECIFIED,
      { message: "Workflow is required" }
    ),
  isActive: z.boolean(),
}

const createEmployeeLevelFormSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(20, "Code must be at most 20 characters")
    .regex(
      /^[A-Z][A-Z0-9-]*$/,
      "Code must start with an uppercase letter and contain only uppercase letters, numbers, and hyphens"
    ),
  ...baseEmployeeLevelFormFields,
})

const updateEmployeeLevelFormSchema = z.object({
  code: z.string().min(1, "Code is required"),
  ...baseEmployeeLevelFormFields,
})

interface EmployeeLevelFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeLevel?: EmployeeLevel | null
  onSuccess?: () => void
}

export function EmployeeLevelFormDialog({
  open,
  onOpenChange,
  employeeLevel,
  onSuccess,
}: EmployeeLevelFormDialogProps) {
  const isEditing = !!employeeLevel
  const createMutation = useCreateEmployeeLevel()
  const updateMutation = useUpdateEmployeeLevel()

  const form = useForm<EmployeeLevelFormValues>({
    resolver: zodResolver(isEditing ? updateEmployeeLevelFormSchema : createEmployeeLevelFormSchema) as never,
    defaultValues: {
      code: "",
      name: "",
      grade: 0,
      type: EmployeeLevelType.EMPLOYEE_LEVEL_TYPE_EXECUTIVE,
      sequence: 0,
      workflow: EmployeeLevelWorkflow.EMPLOYEE_LEVEL_WORKFLOW_DRAFT,
      isActive: true,
    },
  })

  useEffect(() => {
    if (open) {
      if (employeeLevel) {
        form.reset({
          code: employeeLevel.code || "",
          name: employeeLevel.name || "",
          grade: employeeLevel.grade ?? 0,
          type:
            employeeLevel.type ??
            EmployeeLevelType.EMPLOYEE_LEVEL_TYPE_EXECUTIVE,
          sequence: employeeLevel.sequence ?? 0,
          workflow:
            employeeLevel.workflow ??
            EmployeeLevelWorkflow.EMPLOYEE_LEVEL_WORKFLOW_DRAFT,
          isActive: employeeLevel.isActive ?? true,
        })
      } else {
        form.reset({
          code: "",
          name: "",
          grade: 0,
          type: EmployeeLevelType.EMPLOYEE_LEVEL_TYPE_EXECUTIVE,
          sequence: 0,
          workflow: EmployeeLevelWorkflow.EMPLOYEE_LEVEL_WORKFLOW_DRAFT,
          isActive: true,
        })
      }
    }
  }, [open, employeeLevel, form])

  const onSubmit = async (values: EmployeeLevelFormValues) => {
    try {
      if (isEditing && employeeLevel) {
        await updateMutation.mutateAsync({
          id: employeeLevel.employeeLevelId,
          data: {
            employeeLevelId: employeeLevel.employeeLevelId,
            name: values.name,
            grade: values.grade,
            type: values.type,
            sequence: values.sequence,
            workflow: values.workflow,
            isActive: values.isActive,
          },
        })
      } else {
        await createMutation.mutateAsync({
          code: values.code,
          name: values.name,
          grade: values.grade,
          type: values.type,
          sequence: values.sequence,
          workflow: values.workflow,
        })
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("Failed to save Employee Level:", error)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Employee Level" : "Add New Employee Level"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the employee level details. Code cannot be changed."
              : "Create a new employee level."}
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
                        placeholder="e.g., SU, SS-22, P-9"
                        {...field}
                        value={field.value || ""}
                        disabled={isEditing || isPending}
                        className="uppercase"
                        onChange={(e) =>
                          field.onChange(e.target.value.toUpperCase())
                        }
                      />
                    </FormControl>
                    <FormDescription>Uppercase, hyphens allowed</FormDescription>
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
                        placeholder="e.g., Super User, Assistant GM"
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

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={99}
                        {...field}
                        value={field.value ?? 0}
                        disabled={isPending}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormDescription>Numeric grade (0-99)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sequence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sequence</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={999}
                        {...field}
                        value={field.value ?? 0}
                        disabled={isPending}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormDescription>Sort order (0-999)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
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
                        {EMPLOYEE_LEVEL_TYPE_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={String(option.value)}
                          >
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
                name="workflow"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workflow</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select workflow" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EMPLOYEE_LEVEL_WORKFLOW_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={String(option.value)}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                        Inactive levels will not be available for selection
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
