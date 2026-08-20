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

import type { MBSpin } from "@/types/finance/mb-spin"
import { useCreateMBSpin, useUpdateMBSpin } from "@/hooks/finance/use-mb-spin"
import { useMBHeads } from "@/hooks/finance/use-mb-head"
import { ActiveFilter } from "@/types/finance/mb-head"

const formSchema = z.object({
  mbhId: z.string().min(1, "MB Head is required"),
  mbsMgtName: z.string().min(1, "Mgt name is required").max(100),
  mbsOracleSysId: z.string().max(100).optional(),
  mbsDenier: z.coerce.number().positive().optional().or(z.literal("")),
  mbsFilament: z.coerce.number().int().positive().optional().or(z.literal("")),
  // D30: mbsDozing is a retired, contaminated legacy column — kept in the schema so the
  // value round-trips untouched, but deliberately NOT rendered in the form. Do not "fix" this.
  mbsDozing: z.coerce.number().min(0).max(100).optional().or(z.literal("")),
  mbsMbCosting: z.string().max(50).optional(),
  mbsCc: z.string().max(100).optional(),
  mbsCostRateMkt: z.coerce.number().min(0).optional().nullable(),
  mbsStatus: z.string().max(100).optional(),
  mbsLdrPrsn: z.coerce.number().min(0).optional().nullable(),
  mbsRunLdrPct: z.coerce.number().min(0).optional().nullable(),
  mbsFinalProduct: z.string().max(200).optional(),
  mbsIsActive: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

interface MBSpinFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mbSpin?: MBSpin | null
  headId?: string
  onSuccess?: () => void
}

export function MBSpinFormDialog({ open, onOpenChange, mbSpin, headId, onSuccess }: MBSpinFormDialogProps) {
  const isEditing = !!mbSpin
  const createMutation = useCreateMBSpin()
  const updateMutation = useUpdateMBSpin()

  const { data: mbHeadsData, isLoading: isLoadingMBHeads } = useMBHeads({
    pageSize: 200,
    activeFilter: ActiveFilter.ACTIVE_FILTER_ACTIVE,
  })
  const mbHeads = mbHeadsData?.data ?? []

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: {
      mbhId: headId || "", mbsMgtName: "", mbsOracleSysId: "",
      mbsDenier: "", mbsFilament: "", mbsDozing: "", mbsMbCosting: "", mbsCc: "", mbsCostRateMkt: null,
      mbsStatus: "", mbsLdrPrsn: null, mbsRunLdrPct: null, mbsFinalProduct: "", mbsIsActive: true,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        mbSpin
          ? {
              mbhId: mbSpin.mbsMbhId || headId || "",
              mbsMgtName: mbSpin.mbsMgtName,
              mbsOracleSysId: mbSpin.mbsOracleSysId || "",
              mbsDenier: mbSpin.mbsDenier ?? "",
              mbsFilament: mbSpin.mbsFilament ?? "",
              mbsDozing: mbSpin.mbsDozing ?? "",
              mbsMbCosting: mbSpin.mbsMbCosting || "",
              mbsCc: mbSpin.mbsCc ?? "",
              mbsCostRateMkt: mbSpin.mbsCostRateMkt ?? null,
              mbsStatus: mbSpin.mbsStatus || "",
              mbsLdrPrsn: mbSpin.mbsLdrPrsn ?? null,
              mbsRunLdrPct: mbSpin.mbsRunLdrPct ?? null,
              mbsFinalProduct: mbSpin.mbsFinalProduct || "",
              mbsIsActive: mbSpin.mbsIsActive ?? true,
            }
          : { mbhId: headId || "", mbsMgtName: "", mbsOracleSysId: "", mbsDenier: "", mbsFilament: "", mbsDozing: "", mbsMbCosting: "", mbsCc: "", mbsCostRateMkt: null, mbsStatus: "", mbsLdrPrsn: null, mbsRunLdrPct: null, mbsFinalProduct: "", mbsIsActive: true }
      )
    }
  }, [open, mbSpin, headId, form])

  const onSubmit = async (values: FormValues) => {
    try {
      const toOptNum = (v: unknown) => (v === "" || v === undefined ? undefined : Number(v))
      if (isEditing && mbSpin) {
        await updateMutation.mutateAsync({
          id: mbSpin.mbsId,
          data: {
            mbhId: mbSpin.mbsMbhId,
            mbsId: mbSpin.mbsId,
            mbsMgtName: values.mbsMgtName,
            mbsDenier: toOptNum(values.mbsDenier),
            mbsFilament: toOptNum(values.mbsFilament),
            mbsDozing: toOptNum(values.mbsDozing),
            mbsMbCosting: values.mbsMbCosting || undefined,
            mbsCc: values.mbsCc || undefined,
            mbsCostRateMkt: values.mbsCostRateMkt ?? undefined,
            mbsStatus: values.mbsStatus || undefined,
            mbsLdrPrsn: values.mbsLdrPrsn ?? undefined,
            mbsRunLdrPct: values.mbsRunLdrPct ?? undefined,
            mbsFinalProduct: values.mbsFinalProduct || undefined,
            mbsIsActive: values.mbsIsActive,
          },
        })
      } else {
        await createMutation.mutateAsync({
          mbhId: values.mbhId || headId || "",
          mbsMgtName: values.mbsMgtName,
          mbsOracleSysId: values.mbsOracleSysId || undefined,
          mbsDenier: toOptNum(values.mbsDenier),
          mbsFilament: toOptNum(values.mbsFilament),
          mbsDozing: toOptNum(values.mbsDozing),
          mbsMbCosting: values.mbsMbCosting || undefined,
          mbsCc: values.mbsCc || undefined,
          mbsCostRateMkt: values.mbsCostRateMkt ?? undefined,
          mbsStatus: values.mbsStatus || undefined,
          mbsLdrPrsn: values.mbsLdrPrsn ?? undefined,
          mbsRunLdrPct: values.mbsRunLdrPct ?? undefined,
          mbsFinalProduct: values.mbsFinalProduct || undefined,
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
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit MB Spin" : "Add MB Spin"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update MB Spin details." : "Create a new MB Spin record."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!headId && !isEditing && (
              <FormField
                control={form.control}
                name="mbhId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MB Head <span className="text-destructive">*</span></FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isPending || isLoadingMBHeads}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingMBHeads ? "Loading MB Heads…" : "Select an MB Head"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mbHeads.map((head) => (
                          <SelectItem key={head.mbhId} value={head.mbhId}>
                            {head.mbhMbCosting} — {head.mbhMgtName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Parent MB Head for this spin</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mbsMgtName"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Mgt Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Management display name" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mbsOracleSysId"
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
                name="mbsMbCosting"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MB Costing</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Optional" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mbsCc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CC Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. CC-001" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mbsDenier"
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
                name="mbsFilament"
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

            {/*
              D30: the "Dozing %" field (mbsDozing) is intentionally NOT rendered.
              The legacy column mixes two different scales (LDR ~3.55 and oil dozing rate
              ~0.03) and has been retired. Its data is preserved in the DB and still
              round-trips through this form's state — it is only hidden from the UI.
              Use "LDR Aktual (%)" (mbsRunLdrPct) instead. Do not re-add this input.
            */}

            <FormField
              control={form.control}
              name="mbsCostRateMkt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>MB Rate MKT (USD/kg)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.000001" value={field.value ?? ""} placeholder="e.g. 2.500000" disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mbsStatus"
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mbsLdrPrsn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LDR Rencana (%) <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.000001" value={field.value ?? ""} placeholder="Optional" disabled={isPending}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))} />
                    </FormControl>
                    <FormDescription>LDR awal saat produk baru, sebelum masuk mesin spinning.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mbsRunLdrPct"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LDR Aktual (%) <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.000001" min="0" value={field.value ?? ""} placeholder="Optional" disabled={isPending}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))} />
                    </FormControl>
                    <FormDescription>LDR yang benar-benar dipakai saat produksi; nilai inilah yang dipakai perhitungan cost.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mbsFinalProduct"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Final Product <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Optional" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isEditing && (
              <FormField
                control={form.control}
                name="mbsIsActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>Inactive MB Spins are excluded from costing.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isPending} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
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
