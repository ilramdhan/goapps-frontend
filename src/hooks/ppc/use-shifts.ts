"use client"

// PPC shift master hook — read-only picker source (code + name + HH:MM window).

import { useQuery } from "@tanstack/react-query"

import { apiClient, buildQueryString } from "@/lib/api"
import type { PpcShift } from "@/types/ppc/master"
import { ListPpcShiftsResponseParser } from "@/types/ppc/master"

const shiftKeys = {
  all: ["ppc", "shift"] as const,
  list: () => [...shiftKeys.all, "list"] as const,
}

export { shiftKeys }

/** usePpcShifts fetches the active shift rows. */
export function usePpcShifts() {
  return useQuery({
    queryKey: shiftKeys.list(),
    queryFn: async (): Promise<PpcShift[]> => {
      const qs = buildQueryString({ pageSize: 50, activeFilter: 1 })
      const raw = await apiClient.get<unknown>(`/api/v1/ppc/shifts${qs}`)
      return ListPpcShiftsResponseParser.fromJSON(raw).data || []
    },
    staleTime: 5 * 60_000,
  })
}
