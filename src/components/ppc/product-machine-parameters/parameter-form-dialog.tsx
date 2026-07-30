"use client"

import { useEffect, useState } from "react"
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
import { ProductCombobox, MachineCombobox, ParameterCombobox } from "@/components/ppc/comboboxes"

import type { ProductMachineParameter } from "@/types/ppc/master"
import {
  useCreateProductMachineParameter,
  useUpdateProductMachineParameter,
} from "@/hooks/ppc/use-masters"

interface ParameterFormValues {
  cpmProductSysId: string
  machineId: string
  paramId: string
  valueNum: string
  valueText: string
  valueFlag: boolean
}

const positiveInt = z
  .string()
  .min(1, "Required")
  .refine((v) => Number.isInteger(Number(v)) && Number(v) > 0, "Must be a positive integer")

const formSchema = z.object({
  cpmProductSysId: positiveInt,
  machineId: positiveInt,
  paramId: z.string().min(1, "Parameter id is required"),
  valueNum: z.string().refine((v) => v === "" || !Number.isNaN(Number(v)), "Must be a number"),
  valueText: z.string(),
  valueFlag: z.boolean(),
})

interface ParameterFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parameter?: ProductMachineParameter | null
}

export function ParameterFormDialog({ open, onOpenChange, parameter }: ParameterFormDialogProps) {
  const isEditing = !!parameter
  const createMutation = useCreateProductMachineParameter()
  const updateMutation = useUpdateProductMachineParameter()

  // dataType of the picked parameter. In edit mode it comes from the row; in
  // create mode the ParameterCombobox provides it on selection so the value-field
  // hints ("(active)") reflect the chosen parameter's type.
  const [pickedDataType, setPickedDataType] = useState<string>("")

  const form = useForm<ParameterFormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: {
      cpmProductSysId: "",
      machineId: "",
      paramId: "",
      valueNum: "",
      valueText: "",
      valueFlag: false,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        parameter
          ? {
              cpmProductSysId: String(parameter.cpmProductSysId || ""),
              machineId: String(parameter.machineId || ""),
              paramId: parameter.paramId || "",
              valueNum: parameter.valueNum || "",
              valueText: parameter.valueText || "",
              valueFlag: parameter.valueFlag ?? false,
            }
          : {
              cpmProductSysId: "",
              machineId: "",
              paramId: "",
              valueNum: "",
              valueText: "",
              valueFlag: false,
            }
      )
    }
  }, [open, parameter, form])

  const onSubmit = async (values: ParameterFormValues) => {
    try {
      if (isEditing && parameter) {
        await updateMutation.mutateAsync({
          id: String(parameter.pmpId),
          data: {
            pmpId: parameter.pmpId,
            valueNum: values.valueNum || "0",
            valueText: values.valueText,
            valueFlag: values.valueFlag,
          },
        })
      } else {
        await createMutation.mutateAsync({
          cpmProductSysId: Number(values.cpmProductSysId),
          machineId: Number(values.machineId),
          paramId: values.paramId,
          valueNum: values.valueNum || "0",
          valueText: values.valueText,
          valueFlag: values.valueFlag,
          hasValueFlag: true,
        })
      }
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save parameter:", error)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const dataType = parameter?.dataType || pickedDataType

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Parameter" : "Add Parameter"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the parameter value. Product, machine, and parameter cannot be changed."
              : "Set a parameter value for a product-machine pair."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isEditing ? (
              <div className="rounded-lg border p-3 space-y-1 text-sm">
                <div>
                  <span className="text-muted-foreground">Product Sys ID </span>
                  <span className="font-mono">{parameter?.cpmProductSysId}</span>
                  <span className="text-muted-foreground"> · Machine </span>
                  <span className="font-mono">{parameter?.machineNo || parameter?.machineId}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Parameter </span>
                  <span className="font-medium">{parameter?.paramName || "-"}</span>{" "}
                  {parameter?.paramCode ? (
                    <span className="font-mono text-muted-foreground">({parameter.paramCode})</span>
                  ) : null}
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 [&>*]:min-w-0">
                  <FormField
                    control={form.control}
                    name="cpmProductSysId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product</FormLabel>
                        <FormControl>
                          <ProductCombobox
                            value={field.value ? Number(field.value) : undefined}
                            onChange={(id) => field.onChange(String(id))}
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="machineId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Machine</FormLabel>
                        <FormControl>
                          <MachineCombobox
                            value={field.value ? Number(field.value) : undefined}
                            onChange={(id) => field.onChange(String(id))}
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="paramId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parameter</FormLabel>
                      <FormControl>
                        <ParameterCombobox
                          value={field.value || undefined}
                          onChange={(paramId, _code, dt) => {
                            field.onChange(paramId)
                            setPickedDataType(dt)
                          }}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormDescription>
                        Costing parameter (searchable by code or name).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="valueNum"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numeric Value{dataType ? ` ${dataType === "NUMBER" ? "(active)" : ""}` : ""}</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" {...field} value={field.value || ""} disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="valueText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Text Value</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ""} disabled={isPending} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="valueFlag"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Flag Value</FormLabel>
                    <FormDescription>Used when the parameter is a BOOLEAN type.</FormDescription>
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
