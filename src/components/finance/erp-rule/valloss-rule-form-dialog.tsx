"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCreateValLossRule, useUpdateValLossRule } from "@/hooks/finance/use-erp-rule"
import type { ValLossRule } from "@/types/finance/erp-rule"

const formSchema = z.object({
  fgType: z.string().min(1, "FG type is required").max(15, "Max 15 characters"),
  prodType: z.enum(["POY", "PTY", "ITY"]),
  gradeGroup: z.string().min(1, "Grade group is required").max(20),
  basis: z.string().min(1, "Basis is required").max(20),
  valLoss: z.string().regex(/^[0-9]{1,3}(\.[0-9]{1,6})?$/, "Invalid value (max 3 integer and 6 decimal digits)"),
})

type FormValues = z.infer<typeof formSchema>

const emptyValues: FormValues = { fgType: "", prodType: "POY", gradeGroup: "", basis: "", valLoss: "" }

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule?: ValLossRule | null
}

export function VallossRuleFormDialog({ open, onOpenChange, rule }: Props) {
  const isEditing = !!rule
  const createMutation = useCreateValLossRule()
  const updateMutation = useUpdateValLossRule()
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema) as never, defaultValues: emptyValues })

  useEffect(() => {
    if (open) {
      form.reset(
        rule
          ? {
              fgType: rule.fgType,
              prodType: (["POY", "PTY", "ITY"].includes(rule.prodType) ? rule.prodType : "POY") as FormValues["prodType"],
              gradeGroup: rule.gradeGroup,
              basis: rule.basis,
              valLoss: rule.valLoss,
            }
          : emptyValues
      )
    }
  }, [open, rule, form])

  const isPending = createMutation.isPending || updateMutation.isPending

  async function onSubmit(values: FormValues) {
    try {
      if (isEditing && rule) {
        await updateMutation.mutateAsync({ id: rule.id, body: { basis: values.basis, valLoss: values.valLoss } })
      } else {
        await createMutation.mutateAsync(values)
      }
      onOpenChange(false)
    } catch {
      // toast handled in hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Valuation Loss Rule" : "Create Valuation Loss Rule"}</DialogTitle>
          <DialogDescription>Key fields are fixed once created; basis and val loss can be changed.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id="valloss-rule-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="fgType" render={({ field }) => (
              <FormItem>
                <FormLabel>FG type <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input {...field} disabled={isEditing || isPending} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="prodType" render={({ field }) => (
              <FormItem>
                <FormLabel>Prod type <span className="text-destructive">*</span></FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={isEditing || isPending}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {["POY", "PTY", "ITY"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="gradeGroup" render={({ field }) => (
              <FormItem>
                <FormLabel>Grade group <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input {...field} disabled={isEditing || isPending} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="basis" render={({ field }) => (
              <FormItem>
                <FormLabel>Basis <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input {...field} disabled={isPending} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="valLoss" render={({ field }) => (
              <FormItem>
                <FormLabel>Val loss <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input {...field} inputMode="decimal" placeholder="e.g., 1.5" disabled={isPending} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </form>
        </Form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
          <Button type="submit" form="valloss-rule-form" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
