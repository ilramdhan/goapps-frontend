"use client"

import { useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { StatusBadge } from "@/components/common/status-badge"

import { MBDozingImpactPanel } from "./mb-dozing-impact-panel"
// ⭐ DIPERBARUI 2026-08-31 (P4-T2) — the R81/R1 Calculator button (which lived next
// to "LDR Actual (%)"/mbsRunLdrPct, imported from mb-recipe) was removed together
// with the two legacy LDR field blocks below. Its output was always an ABSOLUTE
// target LDR% (see mb-dozing-calculator-dialog.tsx "Result LDR"), which mapped
// 1:1 onto the now-removed "LDR Actual (%)" input. The newer LDR mechanism further
// down this form (mbsLdrCalculatedPct / mbsLdrAdjustmentPct) is a DELTA on top of a
// system-calculated value, not an absolute LDR%, so the calculator's result does not
// map onto it — there is no like-for-like landing spot in this form today. Per task
// scope (P4-T2), inventing a new absolute-LDR input to host it is out of scope (that
// is P7's job), so the button and its dialog import were removed rather than moved.
import type { MBSpin } from "@/types/finance/mb-spin"
import type { NormalizedMBSpinDuplicateImpact } from "@/types/finance/mb-spin"
import { useCreateMBSpin, useUpdateMBSpinWithCascade } from "@/hooks/finance/use-mb-spin"
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
  // ⭐ DITAMBAHKAN 2026-08-31 (P4-T1) — display-only, inherited from the MB Recipe.
  // MBSpin.mbsShadeName has no counterpart on CreateMBSpinRequest/UpdateMBSpinRequest
  // (checked in gen/finance/v1/yarn_master.pb.go — no MbsShadeName field on either
  // request type), so this never goes into the create/update payload; it exists in
  // the schema only so the readonly Input can bind to it via react-hook-form, same as
  // mbsMgtName/mbsFinalProduct below.
  mbsShadeName: z.string().max(200).optional(),
  mbsCostRateMkt: z.coerce.number().min(0).optional().nullable(),
  mbsStatus: z.string().max(100).optional(),
  mbsLdrPrsn: z.coerce.number().min(0).optional().nullable(),
  mbsRunLdrPct: z.coerce.number().min(0).optional().nullable(),
  mbsFinalProduct: z.string().max(200).optional(),
  mbsIsActive: z.boolean(),
  // ⭐ DITAMBAHKAN 2026-08-28 — LDR lock/adjustment write-side (Task E backend, sudah selesai).
  // mbsLdrAdjustmentPct is a manual add-on on top of the system-calculated mbsLdrCalculatedPct
  // (read-only, not in this schema — displayed via the read-only breakdown panel below).
  mbsLdrAdjustmentPct: z.coerce.number().optional().nullable(),
  mbsLdrLockActual: z.boolean().default(false),
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
  const updateMutation = useUpdateMBSpinWithCascade()

  // ⭐ DITAMBAHKAN 2026-08-31 (P7-T5) — mirrors mb-spin-duplicate-dialog.tsx's
  // impactSummary state: the update RPC's response now also carries a child-
  // recalc cascade result (skipped/impactPreview) when a denier/filament/
  // dozing change cascades to this spin's direct children (A6/A7). Holding it
  // here lets the dialog show a brief summary instead of closing immediately
  // and discarding it. Empty/absent (the common case) keeps today's behavior
  // — dialog just closes.
  const [cascadeSummary, setCascadeSummary] = useState<NormalizedMBSpinDuplicateImpact | null>(null)

  // ⭐ DITAMBAHKAN 2026-08-31 (P7-T5) — clears cascadeSummary on open using the
  // "adjusting state during render" pattern (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  // instead of inside the form-reset useEffect below. Unlike
  // mb-spin-duplicate-dialog.tsx's simpler `if (open && mbSpin)` guard, this
  // dialog's effect guard is just `if (open)` (it also handles the create
  // flow, no mbSpin) with a large ternary passed to form.reset — that shape
  // trips the react-hooks "set-state-in-effect" lint rule (confirmed via
  // `npx eslint`) even though the sibling file's structurally-similar effect
  // does not. Resetting during render sidesteps the rule entirely (it only
  // flags setState calls that execute inside an effect body) and needs no
  // eslint-disable.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setCascadeSummary(null)
    }
  }

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
    return `${head.mbhMbCosting} — ${head.mbhMgtName} (no product type yet)`
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: {
      mbhId: headId || "", mbsMgtName: "", mbsOracleSysId: "",
      mbsDenier: "", mbsFilament: "", mbsDozing: "", mbsMbCosting: "", mbsCc: "", mbsShadeName: "", mbsCostRateMkt: null,
      mbsStatus: "", mbsLdrPrsn: null, mbsRunLdrPct: null, mbsFinalProduct: "",
      mbsIsActive: true,
      // ⭐ DITAMBAHKAN 2026-08-28 — LDR lock/adjustment defaults for create flow (unlocked, no adjustment).
      mbsLdrAdjustmentPct: null, mbsLdrLockActual: false,
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
              mbsShadeName: mbSpin.mbsShadeName || "",
              mbsCostRateMkt: mbSpin.mbsCostRateMkt ?? null,
              mbsStatus: mbSpin.mbsStatus || "",
              mbsLdrPrsn: mbSpin.mbsLdrPrsn ?? null,
              mbsRunLdrPct: mbSpin.mbsRunLdrPct ?? null,
              mbsFinalProduct: mbSpin.mbsFinalProduct || "",
              mbsIsActive: mbSpin.mbsIsActive ?? true,
              // ⭐ DITAMBAHKAN 2026-08-28 — seed the lock/adjustment fields from the existing spin.
              mbsLdrAdjustmentPct: mbSpin.mbsLdrAdjustmentPct ?? null,
              mbsLdrLockActual: mbSpin.mbsLdrIsActual ?? false,
            }
          : { mbhId: headId || "", mbsMgtName: "", mbsOracleSysId: "", mbsDenier: "", mbsFilament: "", mbsDozing: "", mbsMbCosting: "", mbsCc: "", mbsShadeName: "", mbsCostRateMkt: null, mbsStatus: "", mbsLdrPrsn: null, mbsRunLdrPct: null, mbsFinalProduct: "", mbsIsActive: true, mbsLdrAdjustmentPct: null, mbsLdrLockActual: false }
      )
    }
  }, [open, mbSpin, headId, form])

  const onSubmit = async (values: FormValues) => {
    try {
      const toOptNum = (v: unknown) => (v === "" || v === undefined ? undefined : Number(v))
      if (isEditing && mbSpin) {
        const result = await updateMutation.mutateAsync({
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
          // ⭐ DITAMBAHKAN 2026-08-28 — LDR lock/adjustment write-side. Edit-only: there is
          // nothing to lock/adjust on a brand-new spin, so these are absent from the create
          // payload below (confirmed CreateMBSpinRequest has no such fields on the generated type).
          mbsLdrAdjustmentPct: values.mbsLdrAdjustmentPct ?? undefined,
          mbsLdrLockActual: values.mbsLdrLockActual,
        })

        // ⭐ DITAMBAHKAN 2026-08-31 (P7-T5) — same "only stick around if there's
        // something to say" rule as mb-spin-duplicate-dialog.tsx: the common
        // case (nothing skipped, nothing affected) closes right away.
        const impact = result?.impact
        const hasCascadeSummary = !!impact && (impact.skippedCount > 0 || impact.impactTotalAffected > 0)
        if (hasCascadeSummary) {
          setCascadeSummary(impact)
          onSuccess?.()
          return
        }
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

  // R3: auto-fill the fields below once a product type / MB Head is picked. This handler is
  // wired to the Select's onValueChange (not a useEffect — synchronous setState in an effect
  // trips the react-hooks "cascading renders" lint rule that has failed this repo before).
  // It only ever runs from the create-flow dropdown above, which is rendered exclusively when
  // `!headId && !isEditing` — so it can never fire while editing an existing spin, and no
  // user-entered value in edit mode is ever at risk of being overwritten.
  // Only fields with an unambiguous 1:1 counterpart on MBHead (yarn_master.proto MBHead vs
  // MBSpin) are copied. mbsCc, mbsCostRateMkt have no MBHead
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
  // ⭐ DITAMBAHKAN 2026-08-28 — LDR lock/adjustment. Watched so the adjustment input's disabled
  // state updates live the moment the user flips the lock Switch, without needing a resubmit.
  const watchedLdrLockActual = useWatch({ control: form.control, name: "mbsLdrLockActual" })
  // Watched so "LDR Efektif" reflects what the user is typing into the adjustment input live,
  // instead of staying frozen at mbSpin.mbsLdrAdjustmentPct (the last-saved server value) until
  // the form is resubmitted and the dialog reopened.
  const watchedLdrAdjustmentPct = useWatch({ control: form.control, name: "mbsLdrAdjustmentPct" })
  // Judgment call (flagged in report): the backend only rejects an adjustment change while
  // CURRENTLY locked AND the request doesn't also unlock/keep-value. The simplest UI that never
  // fights that rule: disable the input only while the spin is currently locked server-side AND
  // the user hasn't (yet) flipped the switch to unlock in this session. The instant they unlock,
  // it's editable — matching what the backend will actually accept.
  const ldrAdjustmentDisabled = isPending || (mbSpin?.mbsLdrIsActual === true && watchedLdrLockActual === true)
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

        {!cascadeSummary && (
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

            {/*
              ⭐ DIPERBARUI 2026-08-28 — Task readonly-derived-fields: mbsMgtName,
              mbsOracleSysId and mbsMbCosting are all populated by handleHeadSelect()
              from the chosen MB Recipe (MB Head) above, or (when isEditing) by
              form.reset() from an existing MBSpin record — including one produced
              by the "Duplicate MB Spin" clone flow (see mb-spin-duplicate-dialog.tsx,
              which clones server-side and then reopens this same dialog in edit
              mode). None of these three are meant to be retyped by hand once a
              source record exists, so they follow the same readOnly+disabled
              pattern already used for mbsStatus below. mbsCc has no MBHead/clone
              counterpart (see R3 comment above) and stays freely editable.
              mbsDenier/mbsFilament are explicitly kept editable per product
              decision even though they are also copied by handleHeadSelect.
            */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="mbsMgtName"
                render={({ field }) => (
                  <FormItem className="col-span-1 flex h-full flex-col sm:col-span-2">
                    <FormLabel>Mgt Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Management display name" readOnly disabled />
                    </FormControl>
                    <FormDescription className="mt-auto">
                      This value follows the selected Master Product Type MB (or the cloned MB Spin) and cannot be edited manually.
                    </FormDescription>
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
                      <Input {...field} placeholder="Optional" readOnly disabled />
                    </FormControl>
                    <FormDescription className="mt-auto">
                      Follows the selected Master Product Type MB (or the cloned MB Spin).
                    </FormDescription>
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
                      <Input {...field} placeholder="Optional" readOnly disabled />
                    </FormControl>
                    <FormDescription className="mt-auto">
                      Follows the selected Master Product Type MB (or the cloned MB Spin).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mbsCc"
                render={({ field }) => (
                  <FormItem className="flex h-full flex-col">
                    {/* ⭐ DIPERBARUI 2026-08-31 (P4-T1) — relabeled from "CC Code" to "Shade
                        Code": confirmed business decision that mbs_cc genuinely holds the
                        shade code, not a cost code. The bound field (mbsCc) is unchanged. */}
                    <FormLabel>Shade Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. CC-001" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* ⭐ DITAMBAHKAN 2026-08-31 (P4-T1) — Shade Name, readonly+disabled, sourced
                  from MBSpin.mbsShadeName. Populated server-side, inherited from the MB
                  Recipe — same readOnly+disabled pattern as mbsMgtName/mbsFinalProduct. */}
              <FormField
                control={form.control}
                name="mbsShadeName"
                render={({ field }) => (
                  <FormItem className="flex h-full flex-col">
                    <FormLabel>Shade Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Optional" readOnly disabled />
                    </FormControl>
                    <FormDescription className="mt-auto">
                      Inherited from the MB Recipe (Master Product Type MB) and cannot be edited manually.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mbsDenier"
                render={({ field }) => (
                  <FormItem className="flex h-full flex-col">
                    <FormLabel>Denier</FormLabel>
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
              ⭐ DIPERBARUI 2026-08-26 — user request: "MB Spin status form should follow the
              value already in MB Recipe, no manual entry needed". This field is now read-only:
              its value is auto-filled by handleHeadSelect() from head.mbhStatus when the user
              picks a Master Product Type MB above (create flow), or from mbSpin.mbsStatus that
              was already stored (edit flow, see form.reset above). The user can no longer type
              a status value manually here.
            */}
            <FormField
              control={form.control}
              name="mbsStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Follows MB Recipe" readOnly disabled />
                  </FormControl>
                  <FormDescription>
                    This value follows the status of the selected MB Recipe (Master Product Type MB) and cannot be edited manually.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/*
              ⭐ DIPERBARUI 2026-08-31 (P4-T2) — the two legacy LDR input blocks that used to
              live here ("LDR Plan (%)" bound to mbsLdrPrsn, "LDR Actual (%)" bound to
              mbsRunLdrPct, plus the Calculator button attached to the latter) were removed
              from the render per the P4-T2 audit. UI-ONLY change:
                - The mbsLdrPrsn/mbsRunLdrPct fields stay in the Zod schema, defaultValues,
                  form.reset() (from mbSpin), and handleHeadSelect() untouched — so RHF still
                  carries whatever value the record already had, and onSubmit still resends
                  that same unchanged value on every save. No value is ever set to undefined/
                  null/omitted by this change, so there is no NULL-out risk irrespective of how
                  the backend treats an absent optional field.
                - DB columns (mst_mb_spin.mbs_ldr_prsn / mbs_run_ldr_pct) and proto fields are
                  untouched — confirmed read-only by yarn_lookup_fill_handler.go:191-193 ("D30:
                  mbs_run_ldr_pct is the actual LDR used in production — the correct value for
                  costing") and lookup_master_repository.go:300-406, both of which read the
                  persisted column value directly from the entity, never from this form.
              Task readonly-derived-fields' EXEMPT-from-readonly rationale for these two fields
              (see prior version of this comment) is now moot since they no longer render.
            */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="mbsFinalProduct"
                render={({ field }) => (
                  <FormItem className="flex h-full flex-col">
                    <FormLabel>Final Product <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Optional" readOnly disabled />
                    </FormControl>
                    <FormDescription className="mt-auto">
                      Follows the selected Master Product Type MB (or the cloned MB Spin).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/*
              ⭐ DITAMBAHKAN 2026-08-28 — LDR lock/adjustment UI (write side "Task E" already
              live on the backend). Provenance model: mbsLdrCalculatedPct is the read-only,
              system-calculated LDR (recalc cascade); mbsLdrAdjustmentPct is a manual add-on;
              effective LDR = calculated + adjustment. mbsLdrIsActual/mbsLdrType describe whether
              the spin is currently "locked" to an actual value, in which case the recalc cascade
              skips this spin and its calculated-LDR children until unlocked.
              This whole block only makes sense for an existing record (nothing to show/lock on
              a brand-new spin), so it is gated the same way as the dozing impact panel below.
            */}
            {mbSpin && (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <dt className="text-xs text-muted-foreground">LDR Terhitung (Sistem)</dt>
                    <dd className="text-sm font-medium">
                      {mbSpin.mbsLdrCalculatedPct != null ? `${mbSpin.mbsLdrCalculatedPct}%` : "Belum dihitung"}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-xs text-muted-foreground">LDR Efektif</dt>
                    <dd className="text-sm font-medium">
                      {mbSpin.mbsLdrCalculatedPct != null || watchedLdrAdjustmentPct != null
                        ? `${(mbSpin.mbsLdrCalculatedPct ?? 0) + (Number(watchedLdrAdjustmentPct) || 0)}%`
                        : "Belum dihitung"}
                    </dd>
                  </div>
                  <div className="space-y-1">
                    <dt className="text-xs text-muted-foreground">Status LDR</dt>
                    <dd>
                      {/* ⭐ DIPERBARUI 2026-08-31 (P7-T2) — was plain text; the design
                          system's Cardinal Rule #2 (CLAUDE.md) requires StatusBadge for
                          any entity status, and the plan explicitly calls for a "Badge
                          tipe LDR". Registry entries added to status-colors.ts (generic). */}
                      <StatusBadge status={mbSpin.mbsLdrType} type="generic" size="sm" />
                    </dd>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="mbsLdrLockActual"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Kunci LDR ke Nilai Aktual</FormLabel>
                        <FormDescription>
                          Mengunci menghentikan kalkulasi ulang otomatis dari spin ini ke turunannya, dan mewajibkan nilai LDR diisi manual/aktual sampai dibuka kuncinya.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isPending} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mbsLdrAdjustmentPct"
                  render={({ field }) => (
                    <FormItem className="flex h-full flex-col">
                      <FormLabel>Penyesuaian LDR (%) <span className="text-xs text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.000001" value={field.value ?? ""} placeholder="Optional" disabled={ldrAdjustmentDisabled}
                          onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))} />
                      </FormControl>
                      <FormDescription className="mt-auto">
                        Nilai tambahan manual di atas LDR terhitung sistem. Tidak dapat diubah selama LDR masih terkunci ke nilai aktual — buka kunci di atas terlebih dahulu.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/*
              P12B checkbox UI (mbsLdrIsFixed / mbsDozingIsFixed) removed per user request.
              The fields are simply no longer sent in the create/update payload — backend
              (internal/domain/mbspin/entity.go:148-156) treats an absent/nil value as
              FIXED=true by default, so omitting them keeps the same safe behavior as
              before without needing any backend change.
            */}

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
        )}

        {/* ⭐ DITAMBAHKAN 2026-08-31 (P7-T5) — cascade/impact summary, same
            lightweight Alert/Badge pattern as mb-spin-duplicate-dialog.tsx's
            impactSummary block (P7-T6). Only shown when the update actually
            skipped a child or would affect a product; the common "nothing to
            report" case never renders this and the dialog just closes. */}
        {cascadeSummary && (
          <>
            <ScrollableDialogBody className="space-y-3" data-testid="update-cascade-summary">
              <Alert>
                <AlertTitle>MB Spin updated</AlertTitle>
                <AlertDescription>
                  &quot;{mbSpin?.mbsMgtName}&quot; was saved. Preview only — nothing below was recalculated.
                </AlertDescription>
              </Alert>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {cascadeSummary.impactTotalAffected > 0 && (
                  <Badge variant="secondary">{cascadeSummary.impactTotalAffected} product(s) affected</Badge>
                )}
                {cascadeSummary.impactTotalLocked > 0 && (
                  <Badge variant="secondary">{cascadeSummary.impactTotalLocked} locked</Badge>
                )}
                {cascadeSummary.skippedCount > 0 && (
                  <Badge variant="outline">{cascadeSummary.skippedCount} child spin(s) skipped</Badge>
                )}
                {cascadeSummary.impactTruncated && <Badge variant="outline">List truncated</Badge>}
              </div>

              {cascadeSummary.skipped.length > 0 && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">
                    Skipped because they&apos;re not editable (e.g. locked as Actual):
                  </p>
                  <ul className="list-disc space-y-0.5 pl-5 text-sm">
                    {cascadeSummary.skipped.map((row) => (
                      <li key={row.mbsId}>
                        {row.mbsMgtName} <span className="text-muted-foreground text-xs">({row.reason})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </ScrollableDialogBody>

            <ScrollableDialogFooter>
              <Button
                onClick={() => {
                  onOpenChange(false)
                }}
              >
                Done
              </Button>
            </ScrollableDialogFooter>
          </>
        )}
      </ScrollableDialogContent>
    </Dialog>
  )
}
