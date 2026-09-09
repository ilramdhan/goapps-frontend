"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { costProductMasterKeys } from "@/hooks/finance/use-cost-product-master"

export interface DuplicateProductInput {
  productSysId: number
  newCodePrefix?: string
  copyParams: boolean
}

export interface DuplicateProductResult {
  newProductSysId: number
  newProductCode: string
}

export function useDuplicateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: DuplicateProductInput): Promise<DuplicateProductResult> => {
      const res = await fetch(`/api/v1/finance/cost-product-masters/${input.productSysId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCodePrefix: input.newCodePrefix ?? "",
          copyParams: input.copyParams,
        }),
      })
      const json = await res.json()
      if (!json.base?.isSuccess) throw new Error(json.base?.message || "Duplicate failed")
      return {
        newProductSysId: Number(json.newProductSysId ?? 0),
        newProductCode: String(json.newProductCode ?? ""),
      }
    },
    onSuccess: (res) => {
      toast.success(`Product duplicated → ${res.newProductCode}`)
      qc.invalidateQueries({ queryKey: costProductMasterKeys.all })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
