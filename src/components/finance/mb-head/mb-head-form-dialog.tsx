"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
  ScrollableDialogContent,
  ScrollableDialogHeader,
  ScrollableDialogBody,
  ScrollableDialogFooter,
} from "@/components/common/scrollable-dialog"
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

import type { MBHead } from "@/types/finance/mb-head"
import { useCreateMBHead, useUpdateMBHead } from "@/hooks/finance/use-mb-head"

const formSchema = z.object({
  mbhMbCosting: z.string().min(1, "MB Costing code is required").max(50),
  mbhOracleSysId: z.string().max(100).optional(),
  mbhMgtName: z.string().max(100).optional(),
  mbhDenier: z.coerce.number().positive().optional().or(z.literal("")),
  mbhFilament: z.coerce.number().int().positive().optional().or(z.literal("")),
  mbhDozing: z.coerce.number().min(0).max(100).optional().or(z.literal("")),
  mbhCheckStatus: z.string().max(50).optional(),
  mbhStatus: z.string().max(100).optional(),
  mbhLdrPrsn: z.coerce.number().min(0).optional().nullable(),
  mbhFinalProduct: z.string().max(200).optional(),
  mbhCode: z.string().max(100).optional(),
  mbhIsBoughtout: z.boolean(),
  mbhDevCode: z.string().max(50).optional(),
  mbhShadeCode: z.string().max(20).optional(),
  mbhShadeName: z.string().max(100).optional(),
  mbhCrossSection: z.string().max(20).optional(),
  mbhLustureCode: z.string().max(10).optional(),
  mbhIsActive: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface MBHeadFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mbHead?: MBHead | null
  onSuccess?: () => void
}

export function MBHeadFormDialog({ open, onOpenChange, mbHead, onSuccess }: MBHeadFormDialogProps) {
  const isEditing = !!mbHead
  const createMutation = useCreateMBHead()
  const updateMutation = useUpdateMBHead()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: {
      mbhMbCosting: "", mbhOracleSysId: "", mbhMgtName: "",
      mbhDenier: "", mbhFilament: "", mbhDozing: "",
      mbhCheckStatus: "", mbhStatus: "", mbhLdrPrsn: null, mbhFinalProduct: "", mbhCode: "",
      mbhIsBoughtout: false, mbhDevCode: "", mbhShadeCode: "", mbhShadeName: "",
      mbhCrossSection: "", mbhLustureCode: "",
      mbhIsActive: true,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        mbHead
          ? {
              mbhMbCosting: mbHead.mbhMbCosting,
              mbhOracleSysId: mbHead.mbhOracleSysId || "",
              mbhMgtName: mbHead.mbhMgtName || "",
              mbhDenier: mbHead.mbhDenier ?? "",
              mbhFilament: mbHead.mbhFilament ?? "",
              mbhDozing: mbHead.mbhDozing ?? "",
              mbhCheckStatus: mbHead.mbhCheckStatus || "",
              mbhStatus: mbHead.mbhStatus || "",
              mbhLdrPrsn: mbHead.mbhLdrPrsn ?? null,
              mbhFinalProduct: mbHead.mbhFinalProduct || "",
              mbhCode: mbHead.mbhCode || "",
              mbhIsBoughtout: mbHead.isBoughtout ?? false,
              mbhDevCode: mbHead.devCode || "",
              mbhShadeCode: mbHead.shadeCode || "",
              mbhShadeName: mbHead.shadeName || "",
              mbhCrossSection: mbHead.crossSection || "",
              mbhLustureCode: mbHead.lustureCode || "",
              mbhIsActive: mbHead.mbhIsActive ?? true,
            }
          : {
              mbhMbCosting: "", mbhOracleSysId: "", mbhMgtName: "", mbhDenier: "", mbhFilament: "", mbhDozing: "",
              mbhCheckStatus: "", mbhStatus: "", mbhLdrPrsn: null, mbhFinalProduct: "", mbhCode: "",
              mbhIsBoughtout: false, mbhDevCode: "", mbhShadeCode: "", mbhShadeName: "",
              mbhCrossSection: "", mbhLustureCode: "",
              mbhIsActive: true,
            }
      )
    }
  }, [open, mbHead, form])

  const onSubmit = async (values: FormValues) => {
    try {
      const toOptNum = (v: unknown) => (v === "" || v === undefined ? undefined : Number(v))
      if (isEditing && mbHead) {
        await updateMutation.mutateAsync({
          id: mbHead.mbhId,
          data: {
            mbhId: mbHead.mbhId,
            mbhMbCosting: values.mbhMbCosting,
            mbhMgtName: values.mbhMgtName || undefined,
            mbhDenier: toOptNum(values.mbhDenier),
            mbhFilament: toOptNum(values.mbhFilament),
            mbhDozing: toOptNum(values.mbhDozing),
            mbhCheckStatus: values.mbhCheckStatus || undefined,
            mbhStatus: values.mbhStatus || undefined,
            mbhLdrPrsn: values.mbhLdrPrsn ?? undefined,
            mbhFinalProduct: values.mbhFinalProduct || undefined,
            mbhCode: values.mbhCode || undefined,
            mbhDevCode: values.mbhDevCode || undefined,
            mbhShadeCode: values.mbhShadeCode || undefined,
            mbhShadeName: values.mbhShadeName || undefined,
            mbhCrossSection: values.mbhCrossSection || undefined,
            mbhLustureCode: values.mbhLustureCode || undefined,
            mbhIsActive: values.mbhIsActive,
          },
        })
      } else {
        await createMutation.mutateAsync({
          mbhMbCosting: values.mbhMbCosting,
          mbhOracleSysId: values.mbhOracleSysId || undefined,
          mbhMgtName: values.mbhMgtName || undefined,
          mbhDenier: toOptNum(values.mbhDenier),
          mbhFilament: toOptNum(values.mbhFilament),
          mbhDozing: toOptNum(values.mbhDozing),
          mbhCheckStatus: values.mbhCheckStatus || undefined,
          mbhStatus: values.mbhStatus || undefined,
          mbhLdrPrsn: values.mbhLdrPrsn ?? undefined,
          mbhFinalProduct: values.mbhFinalProduct || undefined,
          mbhCode: values.mbhCode || undefined,
          mbhIsBoughtout: values.mbhIsBoughtout,
          mbhDevCode: values.mbhDevCode || undefined,
          mbhShadeCode: values.mbhShadeCode || undefined,
          mbhShadeName: values.mbhShadeName || undefined,
          mbhCrossSection: values.mbhCrossSection || undefined,
          mbhLustureCode: values.mbhLustureCode || undefined,
        })
      }
      onOpenChange(false)
      onSuccess?.()
    } catch {
      // toast handled in hook
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ScrollableDialogContent className="sm:max-w-[640px]">
        <ScrollableDialogHeader>
          <DialogTitle>{isEditing ? "Edit MB Head" : "Add MB Head"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update MB Head details." : "Create a new MB Head record."}
          </DialogDescription>
        </ScrollableDialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col min-h-0">
          <ScrollableDialogBody className="space-y-4">
            <FormField
              control={form.control}
              name="mbhMbCosting"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>MB Costing Code <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="MBH-2024-001" disabled={isEditing || isPending} />
                  </FormControl>
                  <FormDescription>Unique batch cost identifier</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mbhOracleSysId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Oracle SYS ID</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Optional" disabled={isEditing || isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mbhMgtName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mgt Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Management display name" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mbhDenier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Denier (dtex)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" min="0" placeholder="Optional" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mbhFilament"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Filaments</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="1" min="1" placeholder="Optional" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="mbhDozing"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dozing %</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" min="0" max="100" placeholder="Optional" disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Oracle Data */}
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium text-muted-foreground mb-3">Oracle Data</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="mbhCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Optional" disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mbhStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Optional" disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mbhCheckStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check Status <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Optional" disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mbhLdrPrsn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LDR Prsn <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.000001" value={field.value ?? ""} placeholder="Optional" disabled={isPending}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mbhFinalProduct"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Final Product <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Optional" disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Recipe Identity */}
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium text-muted-foreground mb-3">Recipe Identity</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="mbhDevCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dev Code <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Optional" disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mbhLustureCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lusture Code <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Optional" disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mbhShadeCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shade Code <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Optional" disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mbhShadeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shade Name <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Optional" disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mbhCrossSection"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Cross Section <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Optional" disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="mbhIsBoughtout"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Bought-out</FormLabel>
                    <FormDescription>
                      Immutable after creation — indicates the MB is sourced externally rather than mixed in-house.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isEditing || isPending} />
                  </FormControl>
                </FormItem>
              )}
            />

            {isEditing && (
              <FormField
                control={form.control}
                name="mbhIsActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>Inactive MB Heads are excluded from costing.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isPending} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

          </ScrollableDialogBody>
          <ScrollableDialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update" : "Create"}
              </Button>
          </ScrollableDialogFooter>
          </form>
        </Form>
      </ScrollableDialogContent>
    </Dialog>
  )
}
