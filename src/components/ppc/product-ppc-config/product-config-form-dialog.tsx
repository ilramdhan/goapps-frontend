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

import type { ProductPPCConfig } from "@/types/ppc/master"
import { useCreateProductPPCConfig, useUpdateProductPPCConfig } from "@/hooks/ppc/use-masters"
import { ProductCombobox, MachineGroupCombobox } from "@/components/ppc/comboboxes"

interface ProductConfigFormValues {
  cpmProductSysId: string
  isCommodityWatch: boolean
  priceSell: string
  machineGroupId: string
  yieldStd: string
  bufferRmPct: string
  axYieldPct: string
  denier: string
}

const numericString = z
  .string()
  .refine((v) => v === "" || !Number.isNaN(Number(v)), "Must be a number")

const formSchema = z.object({
  cpmProductSysId: z
    .string()
    .min(1, "Product system id is required")
    .refine((v) => Number.isInteger(Number(v)) && Number(v) > 0, "Must be a positive integer"),
  isCommodityWatch: z.boolean(),
  priceSell: numericString,
  machineGroupId: z.string(),
  yieldStd: numericString,
  bufferRmPct: numericString,
  axYieldPct: numericString,
  denier: numericString,
})

interface ProductConfigFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config?: ProductPPCConfig | null
}

const NO_GROUP = "0"

export function ProductConfigFormDialog({ open, onOpenChange, config }: ProductConfigFormDialogProps) {
  const isEditing = !!config
  const createMutation = useCreateProductPPCConfig()
  const updateMutation = useUpdateProductPPCConfig()

  const form = useForm<ProductConfigFormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: {
      cpmProductSysId: "",
      isCommodityWatch: false,
      priceSell: "",
      machineGroupId: NO_GROUP,
      yieldStd: "",
      bufferRmPct: "",
      axYieldPct: "",
      denier: "",
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        config
          ? {
              cpmProductSysId: String(config.cpmProductSysId || ""),
              isCommodityWatch: config.isCommodityWatch ?? false,
              priceSell: config.priceSell || "",
              machineGroupId: String(config.machineGroupId || 0),
              yieldStd: config.yieldStd || "",
              bufferRmPct: config.bufferRmPct || "",
              axYieldPct: config.axYieldPct || "",
              denier: config.denier || "",
            }
          : {
              cpmProductSysId: "",
              isCommodityWatch: false,
              priceSell: "",
              machineGroupId: NO_GROUP,
              yieldStd: "",
              bufferRmPct: "",
              axYieldPct: "",
              denier: "",
            }
      )
    }
  }, [open, config, form])

  const onSubmit = async (values: ProductConfigFormValues) => {
    try {
      if (isEditing && config) {
        await updateMutation.mutateAsync({
          id: String(config.configId),
          data: {
            configId: config.configId,
            isCommodityWatch: values.isCommodityWatch,
            priceSell: values.priceSell || "0",
            machineGroupId: Number(values.machineGroupId) || 0,
            yieldStd: values.yieldStd || "0",
            bufferRmPct: values.bufferRmPct || "0",
            axYieldPct: values.axYieldPct || "0",
            denier: values.denier || "",
          },
        })
      } else {
        await createMutation.mutateAsync({
          cpmProductSysId: Number(values.cpmProductSysId),
          isCommodityWatch: values.isCommodityWatch,
          priceSell: values.priceSell || "0",
          machineGroupId: Number(values.machineGroupId) || 0,
          yieldStd: values.yieldStd || "0",
          bufferRmPct: values.bufferRmPct || "0",
          axYieldPct: values.axYieldPct || "0",
          denier: values.denier || "",
        })
      }
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save product config:", error)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Product Config" : "Add Product Config"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `PPC planning config for ${config?.productCode || "product"}.`
              : "Create a PPC planning config for a costing product."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {isEditing ? (
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Product</p>
                <p className="text-sm font-medium">
                  {config?.productName || "-"}{" "}
                  <span className="font-mono text-muted-foreground">({config?.productCode || "-"})</span>
                </p>
              </div>
            ) : (
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
                    <FormDescription>
                      Finance cost_product_master product (soft reference).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                      placeholder="Select a group (optional)"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priceSell"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sell Price</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} value={field.value || ""} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="yieldStd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Std Yield</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} value={field.value || ""} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bufferRmPct"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buffer RM %</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} value={field.value || ""} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="axYieldPct"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AX Yield %</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} value={field.value || ""} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="denier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Denier</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} value={field.value || ""} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isCommodityWatch"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Commodity Watch</FormLabel>
                    <FormDescription>Flag this product for commodity price monitoring.</FormDescription>
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
