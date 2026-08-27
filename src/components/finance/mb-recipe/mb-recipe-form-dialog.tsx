"use client"

// MBRecipeFormDialog — the MB recipe (mst_mb_head) create/edit form. P6 rebuild.
//
// Layout (B14): ScrollableDialogContent + sticky header/footer + three tabs in
// the body. Submit always validates the WHOLE schema — never just the active tab
// — and each TabsTrigger carries a red dot when a field inside it is invalid, so
// an error can never hide behind an unopened tab.
//
// Field rules that are NOT free to change:
//   * Check Status is READ-ONLY (B11). See mb-check-status-display.tsx.
//   * VS Number is required FREE TEXT — no regex, no uppercasing, no trimming to
//     a pattern. "NA" and "0" are legal values (177 production heads hold '0').
//   * Number of Process has NO DEFAULT (gate U-B open) — empty means omitted.
//   * mbhDozing (D30) and mbhShadeCode are kept in state so they round-trip, but
//     are not rendered.
//   * additionalShades (R14, 2026-08-26) joined that same list: the user asked for
//     the "additional shade code / shade name" editor to be removed from this modal.
//     ⛔ UI ONLY. The value is still read from mbHead.additionalShades on open and
//     still submitted verbatim, because the UPDATE payload sends
//     replaceAdditionalShades: true — the array this form submits IS the stored
//     state. Dropping it from the payload (or sending []) would silently DELETE the
//     shades of every legacy recipe the user saves. Do not "clean this up".

import { useEffect, useMemo, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  MBStatusSelect,
  MB_STATUS_DEFAULT,
  MB_CROSS_SECTION_DEFAULT,
  MBCheckStatusDisplay,
  MBNoOfProcessSelect,
  MBCrossSectionSelect,
  // R14 (2026-08-26): MBAdditionalShadesField / AdditionalShadeRow are no longer
  // imported here — the editor is not rendered any more. The component itself is
  // still exported from ./fields and is NOT deleted.
  MAX_ADDITIONAL_SHADES,
} from "@/components/finance/mb-recipe/fields"
import { MBFinalProductCombobox } from "@/components/finance/comboboxes/mb-final-product-combobox"
import { ShadeCombobox } from "@/components/finance/shade/shade-combobox"

import type { MBHead } from "@/types/finance/mb-head"
import { useCreateMBHead, useUpdateMBHead } from "@/hooks/finance/use-mb-head"

// ─── Schema ──────────────────────────────────────────────────────────────────

const shadeRowSchema = z.object({
  mbhsSeqNo: z.number().int().min(1).max(MAX_ADDITIONAL_SHADES),
  // NOT NULL in DB: a row that exists must carry a code.
  mbhsShadeCode: z.string().min(1, "Shade code is required").max(20),
  // Nullable in DB: an empty name is legal and must stay legal.
  mbhsShadeName: z.string().max(100),
})

const formSchema = z.object({
  mbhMbCosting: z.string().min(1, "MB Costing code is required").max(50),
  // G9: proto caps mbh_oracle_sys_id at 30. The old max(100) let the FE accept
  // values the backend would reject.
  mbhOracleSysId: z.string().max(30).optional(),
  mbhMgtName: z.string().min(1, "MB Name is required").max(100),
  mbhDenier: z.coerce.number().positive("POY Denier is required"),
  mbhFilament: z.coerce.number().int().positive("POY Filament is required"),
  // D30: mbhDozing is a retired, contaminated legacy column — kept in the schema so the
  // value round-trips untouched, but deliberately NOT rendered in the form. Do not "fix" this.
  // K-4: the empty literal MUST be the first union branch. With the coercion first, the
  // empty default "" coerces to 0 and satisfies min(0) before `.or(z.literal(""))` is ever
  // tried, so an untouched form would write a fake 0 into a retired column. "" stays "" here,
  // which `toOptNum` turns into `undefined` → field omitted on the wire → column stays NULL.
  mbhDozing: z.literal("").or(z.coerce.number().min(0).max(100)).optional(),
  mbhStatus: z.string().max(100).optional(),
  mbhLdrPrsn: z.coerce.number().min(0, "LDR % is required"),
  mbhRunLdrPct: z.coerce.number().min(0).optional().nullable(),
  mbhFinalProduct: z.string().min(1, "Final Product is required").max(200),
  // B3: this is the "Shade Code" the user sees. Column mbh_code — production has
  // 1669 rows in mbh_code and 0 in mbh_shade_code, so mbh_code is the live one.
  mbhCode: z.string().min(1, "Shade Code is required").max(100),
  mbhIsBoughtout: z.boolean(),
  mbhDevCode: z.string().min(1, "Dev No is required").max(50),
  // Legacy column, empty across all production rows. Not rendered; round-trips only.
  mbhShadeCode: z.string().max(20).optional(),
  mbhShadeName: z.string().min(1, "Shade Name is required").max(100),
  mbhCrossSection: z.string().min(1, "Cross Section is required").max(20),
  mbhLustureCode: z.string().max(10).optional(),
  // 🔴 VS Number: required, FREE TEXT. Deliberately NO .regex() and NO format
  // .refine(). "NA" and "0" are real production values and MUST pass. Adding a
  // pattern here re-opens OQ-17, which the user closed.
  mbhVsNumber: z.string().min(1, "VS Number is required").max(50),
  // 🔴 No default. Gate U-B (should this default to 'D'?) is UNDECIDED, so the
  // empty string is a legal submitted state and is omitted from the payload.
  mbhNoOfProcess: z.string().max(10).optional(),
  additionalShades: z.array(shadeRowSchema).max(MAX_ADDITIONAL_SHADES, `At most ${MAX_ADDITIONAL_SHADES} additional shades`),
  mbhIsActive: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

// ─── Tab wiring ──────────────────────────────────────────────────────────────

const TAB_FIELDS = {
  identitas: ["mbhMbCosting", "mbhMgtName", "mbhOracleSysId", "mbhDevCode", "mbhVsNumber"],
  spesifikasi: [
    "mbhNoOfProcess",
    "mbhCode",
    "mbhShadeName",
    // R14 (2026-08-26): "additionalShades" removed — the tab no longer renders a
    // control for it, so a per-tab error dot could point at nothing.
    "mbhDenier",
    "mbhFilament",
    "mbhCrossSection",
    "mbhLustureCode",
    "mbhLdrPrsn",
    "mbhRunLdrPct",
  ],
  status: ["mbhStatus", "mbhFinalProduct", "mbhIsBoughtout", "mbhIsActive"],
} as const

type TabKey = keyof typeof TAB_FIELDS

// R7 — the wizard order. Object key order is already this, but relying on it
// implicitly would make a future reorder of TAB_FIELDS silently change the
// Back/Next flow, so the sequence is stated once, here.
const TAB_ORDER = ["identitas", "spesifikasi", "status"] as const satisfies readonly TabKey[]
const LAST_TAB: TabKey = TAB_ORDER[TAB_ORDER.length - 1]

const TAB_LABELS: Record<TabKey, string> = {
  identitas: "Identitas",
  spesifikasi: "Spesifikasi",
  status: "Status & Produk",
}

const EMPTY_VALUES: FormValues = {
  mbhMbCosting: "",
  mbhOracleSysId: "",
  mbhMgtName: "",
  mbhDenier: "" as unknown as number,
  mbhFilament: "" as unknown as number,
  mbhDozing: "",
  mbhStatus: MB_STATUS_DEFAULT,
  mbhLdrPrsn: "" as unknown as number,
  mbhRunLdrPct: null,
  mbhFinalProduct: "",
  mbhCode: "",
  mbhIsBoughtout: false,
  mbhDevCode: "",
  mbhShadeCode: "",
  mbhShadeName: "",
  mbhCrossSection: MB_CROSS_SECTION_DEFAULT,
  mbhLustureCode: "",
  mbhVsNumber: "",
  // 🔴 EMPTY on purpose — see U-B above. Do not seed 'D'.
  mbhNoOfProcess: "",
  additionalShades: [],
  mbhIsActive: true,
}

interface MBRecipeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mbHead?: MBHead | null
  onSuccess?: () => void
}

export function MBRecipeFormDialog({ open, onOpenChange, mbHead, onSuccess }: MBRecipeFormDialogProps) {
  const isEditing = !!mbHead
  const createMutation = useCreateMBHead()
  const updateMutation = useUpdateMBHead()

  // R7 — CONTROLLED on purpose (it used to be uncontrolled with a `key`
  // remount). Back/Next have to move the tab programmatically, and the submit
  // button only exists on the last tab, so the active tab is now real state.
  const [activeTab, setActiveTab] = useState<TabKey>(TAB_ORDER[0])

  // Reset to tab 1 whenever the dialog opens on a different record. This is the
  // React-sanctioned "adjust state while rendering" pattern, NOT an effect: a
  // setState inside useEffect here trips react-hooks' cascading-render rule.
  const openKey = open ? (mbHead?.mbhId ?? "new") : "closed"
  const [prevOpenKey, setPrevOpenKey] = useState(openKey)
  if (prevOpenKey !== openKey) {
    setPrevOpenKey(openKey)
    setActiveTab(TAB_ORDER[0])
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: EMPTY_VALUES,
  })

  useEffect(() => {
    if (!open) return
    form.reset(
      mbHead
        ? {
            mbhMbCosting: mbHead.mbhMbCosting,
            mbhOracleSysId: mbHead.mbhOracleSysId || "",
            mbhMgtName: mbHead.mbhMgtName || "",
            mbhDenier: (mbHead.mbhDenier ?? "") as unknown as number,
            mbhFilament: (mbHead.mbhFilament ?? "") as unknown as number,
            mbhDozing: mbHead.mbhDozing ?? "",
            mbhStatus: mbHead.mbhStatus || "",
            mbhLdrPrsn: (mbHead.mbhLdrPrsn ?? "") as unknown as number,
            mbhRunLdrPct: mbHead.mbhRunLdrPct ?? null,
            mbhFinalProduct: mbHead.mbhFinalProduct || "",
            mbhCode: mbHead.mbhCode || "",
            mbhIsBoughtout: mbHead.isBoughtout ?? false,
            mbhDevCode: mbHead.devCode || "",
            mbhShadeCode: mbHead.shadeCode || "",
            mbhShadeName: mbHead.shadeName || "",
            mbhCrossSection: mbHead.crossSection || "",
            mbhLustureCode: mbHead.lustureCode || "",
            mbhVsNumber: mbHead.mbhVsNumber || "",
            mbhNoOfProcess: mbHead.mbhNoOfProcess || "",
            additionalShades: (mbHead.additionalShades ?? []).map((s) => ({
              mbhsSeqNo: s.mbhsSeqNo,
              mbhsShadeCode: s.mbhsShadeCode ?? "",
              mbhsShadeName: s.mbhsShadeName ?? "",
            })),
            mbhIsActive: mbHead.mbhIsActive ?? true,
          }
        : EMPTY_VALUES
    )
  }, [open, mbHead, form])

  // R10: read via the useWatch HOOK (not the form.watch() method) so the
  // ShadeCombobox trigger updates reactively without tripping the
  // react-hooks/incompatible-library rule that flags calling library methods
  // mid-render.
  const watchedShadeName = useWatch({ control: form.control, name: "mbhShadeName" })

  const errors = form.formState.errors
  const tabHasError = useMemo(() => {
    const map = {} as Record<TabKey, boolean>
    ;(Object.keys(TAB_FIELDS) as TabKey[]).forEach((key) => {
      map[key] = TAB_FIELDS[key].some((f) => Boolean(errors[f as keyof FormValues]))
    })
    return map
  }, [errors])

  // ~~Per-row shade errors, flattened for rendering. Kept out of the JSX so the
  // nested optional-chaining does not obscure the layout.~~
  // R14 (2026-08-26): removed together with the editor. Values loaded from the
  // server always satisfy the row schema, and no control can produce an invalid
  // row any more, so there is nothing left to surface.

  const tabIndex = TAB_ORDER.indexOf(activeTab)
  const isFirstTab = tabIndex === 0
  const isLastTab = activeTab === LAST_TAB

  const goPrev = () => {
    if (!isFirstTab) setActiveTab(TAB_ORDER[tabIndex - 1])
  }
  // Next never validates: the schema is validated as a whole on submit, and
  // blocking the wizard per tab would trap the user on a field that another tab
  // is supposed to fill in first.
  const goNext = () => {
    if (!isLastTab) setActiveTab(TAB_ORDER[tabIndex + 1])
  }

  const onSubmit = async (values: FormValues) => {
    try {
      // D13 — absent is NOT zero. An untouched optional must stay off the wire so
      // the column keeps its NULL; never coerce it to 0 or "".
      const toOptNum = (v: unknown) => (v === "" || v === undefined || v === null ? undefined : Number(v))
      const toOptStr = (v: string | undefined) => (v ? v : undefined)

      // Shades are sent as MBHeadShadeInput: name is optional and stays absent
      // when blank, code is always present (the schema guarantees it).
      const shades = values.additionalShades.map((s) => ({
        mbhsSeqNo: s.mbhsSeqNo,
        mbhsShadeCode: s.mbhsShadeCode,
        mbhsShadeName: toOptStr(s.mbhsShadeName),
      }))

      // 🔴 mbhCheckStatus is INTENTIONALLY ABSENT from both payloads. It is a
      // backend-derived value (B11/K-1); sending the UI's copy would let a stale
      // form value overwrite the automation's result.
      if (isEditing && mbHead) {
        await updateMutation.mutateAsync({
          id: mbHead.mbhId,
          data: {
            mbhId: mbHead.mbhId,
            mbhMbCosting: values.mbhMbCosting,
            mbhMgtName: values.mbhMgtName,
            mbhDenier: toOptNum(values.mbhDenier),
            mbhFilament: toOptNum(values.mbhFilament),
            mbhDozing: toOptNum(values.mbhDozing),
            mbhStatus: toOptStr(values.mbhStatus),
            mbhLdrPrsn: values.mbhLdrPrsn ?? undefined,
            mbhRunLdrPct: values.mbhRunLdrPct ?? undefined,
            mbhFinalProduct: values.mbhFinalProduct,
            mbhCode: values.mbhCode,
            mbhDevCode: values.mbhDevCode,
            mbhShadeCode: toOptStr(values.mbhShadeCode),
            mbhShadeName: values.mbhShadeName,
            mbhCrossSection: values.mbhCrossSection,
            mbhLustureCode: toOptStr(values.mbhLustureCode),
            mbhVsNumber: values.mbhVsNumber,
            mbhNoOfProcess: toOptStr(values.mbhNoOfProcess),
            additionalShades: shades,
            // 🔴 ALWAYS true. This form renders every additional shade and is the
            // only editor of them, so the array it submits IS the complete desired
            // state — including the empty array meaning "the user deleted them".
            // With false/absent the backend leaves stored shades untouched, so a
            // deletion made here would silently not persist.
            replaceAdditionalShades: true,
            mbhIsActive: values.mbhIsActive,
          },
        })
      } else {
        await createMutation.mutateAsync({
          mbhMbCosting: values.mbhMbCosting,
          mbhOracleSysId: toOptStr(values.mbhOracleSysId),
          mbhMgtName: values.mbhMgtName,
          mbhDenier: toOptNum(values.mbhDenier),
          mbhFilament: toOptNum(values.mbhFilament),
          mbhDozing: toOptNum(values.mbhDozing),
          mbhStatus: toOptStr(values.mbhStatus),
          mbhLdrPrsn: values.mbhLdrPrsn ?? undefined,
          mbhRunLdrPct: values.mbhRunLdrPct ?? undefined,
          mbhFinalProduct: values.mbhFinalProduct,
          mbhCode: values.mbhCode,
          mbhIsBoughtout: values.mbhIsBoughtout,
          mbhDevCode: values.mbhDevCode,
          mbhShadeCode: toOptStr(values.mbhShadeCode),
          mbhShadeName: values.mbhShadeName,
          mbhCrossSection: values.mbhCrossSection,
          mbhLustureCode: toOptStr(values.mbhLustureCode),
          mbhVsNumber: values.mbhVsNumber,
          mbhNoOfProcess: toOptStr(values.mbhNoOfProcess),
          additionalShades: shades,
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
      <ScrollableDialogContent className="sm:max-w-3xl">
        <ScrollableDialogHeader>
          <DialogTitle>{isEditing ? "Edit MB Recipe" : "Add MB Recipe"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update MB recipe details." : "Create a new MB recipe record."}
          </DialogDescription>
        </ScrollableDialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <ScrollableDialogBody>
              {/*
                ~~UNCONTROLLED on purpose. The tab only needs to reset to the first
                one each time the dialog opens on a different record, and `key`
                does that by remounting.~~
                R7 (2026-08-26): now CONTROLLED — Back/Next move the tab, so the
                value has to be driven from state. The reset-on-open is done in
                the same effect that resets the form, not by remounting.
              */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
                <TabsList>
                  {(Object.keys(TAB_FIELDS) as TabKey[]).map((key) => (
                    <TabsTrigger
                      key={key}
                      value={key}
                      data-testid={`${key}-tab`}
                      data-has-error={tabHasError[key] ? "true" : "false"}
                    >
                      {TAB_LABELS[key]}
                      {tabHasError[key] && (
                        <span
                          data-testid={`tab-error-dot-${key}`}
                          aria-label={`${TAB_LABELS[key]} has errors`}
                          className="bg-destructive ml-2 inline-block h-2 w-2 rounded-full"
                        />
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* ── Tab 1: Identitas ─────────────────────────────────── */}
                <TabsContent value="identitas" forceMount className="space-y-4 pt-4 data-[state=inactive]:hidden">
                  <FormField
                    control={form.control}
                    name="mbhMbCosting"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          MB Costing Code <span className="text-destructive">*</span>
                        </FormLabel>
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
                      name="mbhMgtName"
                      render={({ field }) => (
                        <FormItem className="flex h-full flex-col">
                          <FormLabel>
                            MB Name <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="MB display name" disabled={isPending} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mbhOracleSysId"
                      render={({ field }) => (
                        <FormItem className="flex h-full flex-col">
                          <FormLabel>
                            Oracle SYS ID <span className="text-muted-foreground text-xs">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} maxLength={30} placeholder="Optional" disabled={isEditing || isPending} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mbhDevCode"
                      render={({ field }) => (
                        <FormItem className="flex h-full flex-col">
                          <FormLabel>
                            Dev No <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Development number" disabled={isPending} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mbhVsNumber"
                      render={({ field }) => (
                        <FormItem className="flex h-full flex-col">
                          <FormLabel>
                            VS Number <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            {/* Free text. No pattern, no auto-uppercase, no trim-to-format. */}
                            <Input {...field} placeholder="e.g. 71125, VS-78545, NA" disabled={isPending} />
                          </FormControl>
                          <FormDescription className="mt-auto">Free text — any value is accepted.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* ── Tab 2: Spesifikasi ───────────────────────────────── */}
                <TabsContent value="spesifikasi" forceMount className="space-y-4 pt-4 data-[state=inactive]:hidden">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="mbhNoOfProcess"
                      render={({ field }) => (
                        <FormItem className="flex h-full flex-col">
                          <FormLabel>
                            Number of Process <span className="text-muted-foreground text-xs">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <MBNoOfProcessSelect
                              value={field.value}
                              onChange={field.onChange}
                              disabled={isPending}
                            />
                          </FormControl>
                          <FormDescription className="mt-auto">Left empty unless chosen — no default is applied.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mbhLustureCode"
                      render={({ field }) => (
                        <FormItem className="flex h-full flex-col">
                          <FormLabel>
                            Lusture Code <span className="text-muted-foreground text-xs">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Optional" disabled={isPending} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/*
                      R10 (2026-08-26): "Shade Code" (column mbh_code, schema
                      field mbhCode) and "Shade Name" (mbhShadeName) used to be
                      two free-text inputs the user typed by hand. Master shade
                      (cost_erp_shade) now exists, so both are set together
                      from ONE combobox picked against the master — see
                      shade-combobox.tsx for why the trigger always shows the
                      current value even when it has no match in master
                      (legacy recipes).
                      The col-span-2 keeps this control the same total width
                      the two side-by-side inputs used to occupy.
                    */}
                    <FormField
                      control={form.control}
                      name="mbhCode"
                      render={({ field }) => (
                        <FormItem className="col-span-2 flex h-full flex-col">
                          <FormLabel>
                            Shade <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <ShadeCombobox
                              code={field.value}
                              name={watchedShadeName}
                              onSelect={(shadeCode, shadeName) => {
                                // Auto-fill is wired to the combobox's onSelect
                                // handler, NOT a useEffect — this repo's lint
                                // rule forbids synchronous setState inside
                                // useEffect.
                                field.onChange(shadeCode)
                                form.setValue("mbhShadeName", shadeName, {
                                  shouldValidate: true,
                                  shouldDirty: true,
                                })
                              }}
                              disabled={isPending}
                            />
                          </FormControl>
                          <FormDescription>
                            Picked from the shade master. Older recipes may show a shade code/name that no longer
                            exists in master — it stays as-is until you pick a new one.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/*
                      mbhShadeName has no visible control any more (it is set
                      together with mbhCode above), but it is still a real,
                      separately-validated RHF field — this keeps its own
                      FormMessage (e.g. if a legacy row somehow has one set
                      without the other) reachable without a second input.
                    */}
                    <FormField
                      control={form.control}
                      name="mbhShadeName"
                      render={() => (
                        <div className="col-span-2 -mt-2">
                          <FormMessage />
                        </div>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mbhDenier"
                      render={({ field }) => (
                        <FormItem className="flex h-full flex-col">
                          <FormLabel>
                            Denier <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.01" min="0" disabled={isPending} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mbhFilament"
                      render={({ field }) => (
                        <FormItem className="flex h-full flex-col">
                          <FormLabel>
                            Filaments <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="1" min="1" disabled={isPending} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mbhCrossSection"
                      render={({ field }) => (
                        <FormItem className="flex h-full flex-col">
                          <FormLabel>
                            Cross Section <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <MBCrossSectionSelect
                              value={field.value}
                              onChange={field.onChange}
                              disabled={isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mbhLdrPrsn"
                      render={({ field }) => (
                        <FormItem className="flex h-full flex-col">
                          <FormLabel>
                            LDR % <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.000001" min="0" disabled={isPending} />
                          </FormControl>
                          <FormDescription className="mt-auto">LDR awal saat produk baru, sebelum masuk mesin spinning.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mbhRunLdrPct"
                      render={({ field }) => (
                        <FormItem className="col-span-2 flex h-full flex-col">
                          <FormLabel>
                            LDR Aktual (%) <span className="text-muted-foreground text-xs">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.000001"
                              min="0"
                              value={field.value ?? ""}
                              placeholder="Optional"
                              disabled={isPending}
                              onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription className="mt-auto">
                            LDR yang benar-benar dipakai saat produksi; nilai inilah yang dipakai perhitungan cost.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/*
                    TODO(G5): the "Dozing" field belongs on this tab, but its LABEL
                    has not been decided by the user — gate G5 is still OPEN. It is
                    left out rather than guessed at. When G5 closes, add the input
                    here bound to `mbhDozing` (already in the schema and already
                    round-tripping) with the label G5 settles on.
                    ⚠ Note D30: the legacy mbh_dozing column mixes two scales, so
                    whether this field should bind to mbh_dozing at all is part of
                    what G5 must answer. Do not wire it on a hunch.
                  */}

                  {/*
                    ~~Additional Shades editor (max 2 rows, code required, name
                    optional) lived here, rendered through MBAdditionalShadesField.~~

                    ⭐ R14 (2026-08-26) — user: "Form additional shade code / shade
                    name di modal MB Recipe sepertinya sudah tidak diperlukan lagi."
                    The editor is NO LONGER RENDERED.
                    ⛔ DISPLAY-ONLY, exactly like mbhDozing/mbhShadeCode above: the
                    field stays in the zod schema, in EMPTY_VALUES, in the form.reset
                    seed and in BOTH payloads, so a stored recipe's shades come in and
                    go back out byte-for-byte. Because the update payload carries
                    replaceAdditionalShades: true, sending [] here would WIPE the
                    stored rows on every save. Do not remove the round-trip.
                  */}
                </TabsContent>

                {/* ── Tab 3: Status & Produk ───────────────────────────── */}
                <TabsContent value="status" forceMount className="space-y-4 pt-4 data-[state=inactive]:hidden">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="mbhStatus"
                      render={({ field }) => (
                        <FormItem className="flex h-full flex-col">
                          <FormLabel>Status</FormLabel>
                          <FormControl>
                            <MBStatusSelect value={field.value} onChange={field.onChange} disabled={isPending} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/*
                      🔴 Check Status is NOT a form field. It is rendered outside
                      <FormField> on purpose: there is no schema entry, no
                      registration and no payload key for it, so there is nothing a
                      user interaction could change or submit.
                    */}
                    <FormItem className="flex h-full flex-col">
                      <FormLabel>
                        Check Status (system-calculated){" "}
                        <span className="text-muted-foreground text-xs">(read-only)</span>
                      </FormLabel>
                      <MBCheckStatusDisplay value={mbHead?.mbhCheckStatusCalc} />
                      <FormDescription className="mt-auto">
                        Derived automatically from status — not editable.
                      </FormDescription>
                    </FormItem>
                    {/*
                      ~~Legacy Oracle check status, shown SIDE BY SIDE with the derived
                      one — user decision, plan §11 item 42 = option (2). This column
                      is FROZEN: it records what the Oracle import said and is never
                      written by the application. It appears on this detail view ONLY;
                      table, filter and export use the derived column above.~~

                      ⭐ 2026-08-26 — user decision SUPERSEDES the side-by-side one
                      above: only ONE check-status column is shown on screen, the
                      application-calculated `mbh_check_status_calc`. The frozen
                      Oracle column `mbh_check_status` is NO LONGER RENDERED anywhere
                      in the UI.
                      ⛔ This is a DISPLAY-only change: the column still exists in the
                      database as an archive, and `mbhCheckStatus` is still carried by
                      the type, the normalizer and the fetched payload — it is simply
                      never rendered. Nothing was dropped from the data flow.
                    */}
                    <FormField
                      control={form.control}
                      name="mbhFinalProduct"
                      render={({ field }) => (
                        <FormItem className="col-span-2 flex h-full flex-col">
                          <FormLabel>
                            Final Product <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <MBFinalProductCombobox
                              value={field.value}
                              onChange={field.onChange}
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
                    name="mbhIsBoughtout"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Bought-out</FormLabel>
                          <FormDescription>
                            Immutable after creation — indicates the MB is sourced externally rather than mixed
                            in-house.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isEditing || isPending}
                          />
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
                            <FormDescription>Inactive MB recipes are excluded from costing.</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isPending} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </ScrollableDialogBody>

            <ScrollableDialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              {!isFirstTab && (
                <Button type="button" variant="outline" data-testid="tab-back" onClick={goPrev} disabled={isPending}>
                  Back
                </Button>
              )}
              {!isLastTab && (
                <Button type="button" data-testid="tab-next" onClick={goNext} disabled={isPending}>
                  Next
                </Button>
              )}
              {/*
                R7 — submit EXISTS ONLY ON THE LAST TAB. Rendering it everywhere
                was the actual complaint: pressing Create on tab 1 fired a submit
                that failed validation on fields the user had not reached yet, and
                nothing moved. Keeping it mounted-but-hidden would not fix that,
                because Enter would still reach it.
              */}
              {isLastTab && (
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? "Update" : "Create"}
                </Button>
              )}
            </ScrollableDialogFooter>
          </form>
        </Form>
      </ScrollableDialogContent>
    </Dialog>
  )
}
