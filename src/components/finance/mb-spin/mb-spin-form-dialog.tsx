"use client"

import { useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Calculator, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
// R4: modal MB Spin dulunya memakai <DialogContent> polos tanpa max-h/overflow,
// sehingga form 15 field memanjang melewati layar dan tidak bisa di-scroll di
// dalam modal. Disamakan dengan MB Recipe yang sudah memakai ScrollableDialog.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"

import { MBDozingImpactPanel } from "./mb-dozing-impact-panel"
// R81/R1: the LDR/dozing calculator lives in components/finance/mb-recipe (built
// there first). It is reused here via a cross-folder import rather than moved —
// moving it would require touching mb-recipe/index.ts and mb-recipe's own
// detail-client.tsx import, which is unnecessary risk for a read-only, stateless
// dialog that has zero mb-recipe-specific dependencies (see its own file header).
import { MBDozingCalculatorDialog } from "@/components/finance/mb-recipe"
import type { MBSpin } from "@/types/finance/mb-spin"
import { useCreateMBSpin, useUpdateMBSpin } from "@/hooks/finance/use-mb-spin"
import { useMBHeads } from "@/hooks/finance/use-mb-head"
import { ActiveFilter } from "@/types/finance/mb-head"
import { useCostProductMasters } from "@/hooks/finance/use-cost-product-master"

const formSchema = z.object({
  mbhId: z.string().min(1, "Master Product Type MB is required"),
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
  // P12B: tri-state fix/actual markers. undefined = "belum ditandai" (backend treats
  // NULL as FIXED, recalc-safe). Never coerce to false — that would mark the row
  // recalculable and silently let P13 overwrite a human-entered value.
  mbsLdrIsFixed: z.boolean().optional(),
  mbsDozingIsFixed: z.boolean().optional(),
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
  // R81/R1: "letakkan calculator dozing di halaman mb spin, karena di halaman mb
  // spin lah ldr atau dozing actual biasanya di inputkan" — placed right next to
  // the "LDR Aktual (%)" (mbsRunLdrPct) field below, since that is the exact
  // input the calculator's result is meant to feed. Read-only (K-18): it never
  // writes into the form itself, matching the mb-recipe usage it was copied
  // from — user reads the number and types it in manually.
  const [dozingCalcOpen, setDozingCalcOpen] = useState(false)

  const { data: mbHeadsData, isLoading: isLoadingMBHeads } = useMBHeads({
    pageSize: 200,
    activeFilter: ActiveFilter.ACTIVE_FILTER_ACTIVE,
  })
  const mbHeads = mbHeadsData?.data ?? []

  // R2: the picker must read as "Master Product Type MB", not "MB Head" — but the value
  // stored on submit is still the real mbs_mbh_id (proto yarn_master.proto:1832), unchanged.
  // Each head's cost_product_id (yarn_master.proto:1273) is a soft link, written once at the
  // DRAFT->VALIDATED transition (goapps-backend mb_autogen_repository.go), so it is NULL for
  // any head still in DRAFT. Fetching cost-product-masters here only gives us the DISPLAY
  // LABEL (product code + name) for heads that already have one — it never changes which
  // head is selected or what gets saved. Heads without a linked product yet fall back to
  // their own head label so they stay selectable (no regression for un-validated heads).
  const { data: costProductsData, isLoading: isLoadingCostProducts } = useCostProductMasters({
    pageSize: 200,
    activeFilter: "active",
  })
  const costProductById = new Map((costProductsData?.items ?? []).map((p) => [p.productSysId, p]))
  function headOptionLabel(head: (typeof mbHeads)[number]): string {
    const product = head.costProductId ? costProductById.get(head.costProductId) : undefined
    if (product) return `${product.productCode} — ${product.productName}`
    return `${head.mbhMbCosting} — ${head.mbhMgtName} (belum ada product type)`
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: {
      mbhId: headId || "", mbsMgtName: "", mbsOracleSysId: "",
      mbsDenier: "", mbsFilament: "", mbsDozing: "", mbsMbCosting: "", mbsCc: "", mbsCostRateMkt: null,
      mbsStatus: "", mbsLdrPrsn: null, mbsRunLdrPct: null, mbsFinalProduct: "",
      mbsLdrIsFixed: undefined, mbsDozingIsFixed: undefined, mbsIsActive: true,
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
              // Absence-vs-zero (D13): keep undefined undefined; NO `?? false` here.
              mbsLdrIsFixed: mbSpin.mbsLdrIsFixed,
              mbsDozingIsFixed: mbSpin.mbsDozingIsFixed,
              mbsIsActive: mbSpin.mbsIsActive ?? true,
            }
          : { mbhId: headId || "", mbsMgtName: "", mbsOracleSysId: "", mbsDenier: "", mbsFilament: "", mbsDozing: "", mbsMbCosting: "", mbsCc: "", mbsCostRateMkt: null, mbsStatus: "", mbsLdrPrsn: null, mbsRunLdrPct: null, mbsFinalProduct: "", mbsLdrIsFixed: undefined, mbsDozingIsFixed: undefined, mbsIsActive: true }
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
            mbsLdrIsFixed: values.mbsLdrIsFixed,
            mbsDozingIsFixed: values.mbsDozingIsFixed,
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
          mbsLdrIsFixed: values.mbsLdrIsFixed,
          mbsDozingIsFixed: values.mbsDozingIsFixed,
        })
      }
      onOpenChange(false)
      onSuccess?.()
    } catch {
      // toast handled in hook
    }
  }

  // R3: auto-fill the fields below once a product type / MB Head is picked. This handler is
  // wired to the Select's onValueChange (not a useEffect — synchronous setState in an effect
  // trips the react-hooks "cascading renders" lint rule that has failed this repo before).
  // It only ever runs from the create-flow dropdown above, which is rendered exclusively when
  // `!headId && !isEditing` — so it can never fire while editing an existing spin, and no
  // user-entered value in edit mode is ever at risk of being overwritten.
  // Only fields with an unambiguous 1:1 counterpart on MBHead (yarn_master.proto MBHead vs
  // MBSpin) are copied. mbsCc, mbsCostRateMkt, mbsLdrIsFixed, mbsDozingIsFixed have no MBHead
  // ~~counterpart and mbsStatus's only near-namesake (mbh_status) is documented as a legacy/
  // frozen Oracle trace field, not a value meant to propagate — all five are deliberately left
  // untouched rather than guessed.~~
  // ⭐ DIPERBARUI 2026-08-26 — komentar di atas SALAH: "legacy/frozen Oracle trace" itu deskripsi
  // untuk mbh_check_status (lihat MBHeadFormData.mbhCheckStatus di types/finance/mb-head.ts),
  // BUKAN untuk mbh_status. mbh_status justru field yang sama persis domainnya dengan mbs_status:
  // proto yarn_master.proto mendokumentasikan mbh_status sebagai "head status (R and D/Spinning/
  // Boughtout)" dan mbs_status sebagai "spinning status (Spinning/R and D/Boughtout)" — nilai yang
  // sama, dan MB_STATUS_OPTIONS di mb-recipe/fields/mb-status-select.tsx (dropdown status form MB
  // Recipe, yaitu MBHead) persis ["R and D", "Spinning", "Boughtout"]. Backend menyimpan mbs_status
  // apa adanya (mb_spin_repository.go) tanpa validasi server-side, jadi tidak ada sumber lain yang
  // lebih berwenang selain mbh_status milik head yang dipilih. Permintaan user: field status MB
  // Spin ikut MB Recipe saja, tidak diisi manual — maka mbsStatus ikut disalin di sini, dan field-
  // nya dibuat read-only di UI di bawah (lihat FormField "mbsStatus").
  function handleHeadSelect(value: string, onChange: (v: string) => void) {
    onChange(value)
    const head = mbHeads.find((h) => h.mbhId === value)
    if (!head) return
    form.setValue("mbsMgtName", head.mbhMgtName || "", { shouldDirty: true })
    form.setValue("mbsOracleSysId", head.mbhOracleSysId || "", { shouldDirty: true })
    form.setValue("mbsMbCosting", head.mbhMbCosting || "", { shouldDirty: true })
    form.setValue("mbsDenier", head.mbhDenier ?? "", { shouldDirty: true })
    form.setValue("mbsFilament", head.mbhFilament ?? "", { shouldDirty: true })
    form.setValue("mbsLdrPrsn", head.mbhLdrPrsn ?? null, { shouldDirty: true })
    form.setValue("mbsRunLdrPct", head.mbhRunLdrPct ?? null, { shouldDirty: true })
    form.setValue("mbsFinalProduct", head.mbhFinalProduct || "", { shouldDirty: true })
    // ⭐ DIPERBARUI 2026-08-26 — status MB Spin mengikuti status MB Recipe (MB Head) terpilih,
    // tidak lagi diisi manual oleh user (permintaan user).
    form.setValue("mbsStatus", head.mbhStatus || "", { shouldDirty: true })
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  /*
    P7 impact preview. Per the plan the panel is triggered ONLY by a change to the
    dozing-driving fields on the SPIN form, so it stays hidden until the user
    actually edits one. mbsDozing is NOT watched here: D30 retired that column and
    the form does not render it, so denier and filament are the only two live
    triggers. Read-only (K-18) — the panel previews, it never writes.
  */
  const watchedDenier = useWatch({ control: form.control, name: "mbsDenier" })
  const watchedFilament = useWatch({ control: form.control, name: "mbsFilament" })
  const dozingFieldsTouched =
    isEditing &&
    !!mbSpin &&
    (String(watchedDenier ?? "") !== String(mbSpin.mbsDenier ?? "") ||
      String(watchedFilament ?? "") !== String(mbSpin.mbsFilament ?? ""))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ScrollableDialogContent className="sm:max-w-[560px]">
        <ScrollableDialogHeader>
          <DialogTitle>{isEditing ? "Edit MB Spin" : "Add MB Spin"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update MB Spin details." : "Create a new MB Spin record."}
          </DialogDescription>
        </ScrollableDialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <ScrollableDialogBody className="space-y-4">
            {!headId && !isEditing && (
              <FormField
                control={form.control}
                name="mbhId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Master Product Type MB <span className="text-destructive">*</span></FormLabel>
                    <Select
                      onValueChange={(value) => handleHeadSelect(value, field.onChange)}
                      value={field.value}
                      disabled={isPending || isLoadingMBHeads || isLoadingCostProducts}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              isLoadingMBHeads || isLoadingCostProducts
                                ? "Loading Master Product Type MB…"
                                : "Select a Master Product Type MB"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mbHeads.map((head) => (
                          <SelectItem key={head.mbhId} value={head.mbhId}>
                            {headOptionLabel(head)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Master Product Type MB for this spin — selecting it fills the fields below automatically.
                    </FormDescription>
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
                  <FormItem className="col-span-2 flex h-full flex-col">
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
                  <FormItem className="flex h-full flex-col">
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
                  <FormItem className="flex h-full flex-col">
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
                  <FormItem className="flex h-full flex-col">
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
                  <FormItem className="flex h-full flex-col">
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
                  <FormItem className="flex h-full flex-col">
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

            {/*
              ⭐ DIPERBARUI 2026-08-26 — permintaan user: "form status mb spin ikuti value yg ada
              di mb recipe saja jadi tidak perlu isi manual". Field ini sekarang read-only:
              nilainya diisi otomatis oleh handleHeadSelect() dari head.mbhStatus saat user memilih
              Master Product Type MB di atas (create flow), atau dari mbSpin.mbsStatus yang sudah
              tersimpan (edit flow, lihat form.reset di atas). User tidak bisa lagi mengetik nilai
              status secara manual di sini.
            */}
            <FormField
              control={form.control}
              name="mbsStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Mengikuti MB Recipe" readOnly disabled />
                  </FormControl>
                  <FormDescription>
                    Nilai ini mengikuti status MB Recipe (Master Product Type MB) yang dipilih dan tidak bisa diisi manual.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mbsLdrPrsn"
                render={({ field }) => (
                  <FormItem className="flex h-full flex-col">
                    <FormLabel>LDR Rencana (%) <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.000001" value={field.value ?? ""} placeholder="Optional" disabled={isPending}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))} />
                    </FormControl>
                    <FormDescription className="mt-auto">LDR awal saat produk baru, sebelum masuk mesin spinning.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mbsRunLdrPct"
                render={({ field }) => (
                  <FormItem className="flex h-full flex-col">
                    <div className="flex items-center justify-between gap-2">
                      <FormLabel>LDR Aktual (%) <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setDozingCalcOpen(true)}
                      >
                        <Calculator className="h-3 w-3 mr-1" />
                        Calculator
                      </Button>
                    </div>
                    <FormControl>
                      <Input {...field} type="number" step="0.000001" min="0" value={field.value ?? ""} placeholder="Optional" disabled={isPending}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))} />
                    </FormControl>
                    <FormDescription className="mt-auto">LDR yang benar-benar dipakai saat produksi; nilai inilah yang dipakai perhitungan cost.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mbsFinalProduct"
                render={({ field }) => (
                  <FormItem className="flex h-full flex-col">
                    <FormLabel>Final Product <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Optional" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/*
              P12B: fix/actual markers. THREE states, not two:
                undefined -> "belum ditandai" (DB NULL). Backend IsFixedLDR/IsFixedDozing
                            treat NULL as FIXED, so legacy rows are never recalculated.
                true      -> nilai FIX (dikunci, tidak akan ditimpa recalc)
                false     -> nilai hasil hitung (boleh ditimpa recalc P13)
              The checkbox renders undefined as "indeterminate". Clicking it commits to
              true/false; there is no way back to undefined, which is safe because
              undefined and true mean the same thing to the backend.
              Do NOT collapse undefined to false here — that flips a row from
              protected to recalculable without the user asking.
            */}
            <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
              <FormField
                control={form.control}
                name="mbsLdrIsFixed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value === undefined ? "indeterminate" : field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === "indeterminate" ? undefined : checked === true)
                        }
                        disabled={isPending}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>LDR nilai FIX</FormLabel>
                      <FormDescription>
                        Centang bila LDR diisi manual dan tidak boleh ditimpa hitung ulang.
                        Kotak abu-abu = belum ditandai (diperlakukan FIX).
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mbsDozingIsFixed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value === undefined ? "indeterminate" : field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === "indeterminate" ? undefined : checked === true)
                        }
                        disabled={isPending}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Dozing nilai FIX</FormLabel>
                      <FormDescription>
                        Centang bila dozing diisi manual dan tidak boleh ditimpa hitung ulang.
                        Kotak abu-abu = belum ditandai (diperlakukan FIX).
                      </FormDescription>
                    </div>
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

            {dozingFieldsTouched && mbSpin && (
              <div className="border-t pt-4">
                <MBDozingImpactPanel mbsId={mbSpin.mbsId} />
              </div>
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
      <MBDozingCalculatorDialog open={dozingCalcOpen} onOpenChange={setDozingCalcOpen} />
    </Dialog>
  )
}
