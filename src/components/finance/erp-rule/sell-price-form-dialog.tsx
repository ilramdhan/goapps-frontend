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
import { useUpsertSellPrice } from "@/hooks/finance/use-erp-rule"
import type { SellPrice } from "@/types/finance/erp-rule"

const formSchema = z.object({
  price: z.string().regex(/^[0-9]+(\.[0-9]{1,6})?$/, "Invalid price"),
})

type FormValues = z.infer<typeof formSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  sellPrice: SellPrice | null
}

export function SellPriceFormDialog({ open, onOpenChange, sellPrice }: Props) {
  const mutation = useUpsertSellPrice()
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema) as never, defaultValues: { price: "" } })

  useEffect(() => {
    if (open) form.reset({ price: sellPrice?.price ?? "" })
  }, [open, sellPrice, form])

  async function onSubmit(values: FormValues) {
    if (!sellPrice) return
    try {
      await mutation.mutateAsync({ basis: sellPrice.basis, body: { price: values.price } })
      onOpenChange(false)
    } catch {
      // toast handled in hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Edit Sell Price</DialogTitle>
          <DialogDescription>Basis {sellPrice?.basis}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id="sell-price-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="price" render={({ field }) => (
              <FormItem>
                <FormLabel>Price <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input {...field} inputMode="decimal" disabled={mutation.isPending} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </form>
        </Form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" form="sell-price-form" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
