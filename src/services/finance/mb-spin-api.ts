// MB Spin API service — non-CRUD action(s): Duplicate (P8)

import type { MBSpin } from "@/types/finance/mb-spin"

interface BFFEnvelope<T> {
  base?: { isSuccess?: boolean; message?: string }
  data?: T
}

export interface DuplicateMBSpinInput {
  mbhId: string
  mbsId: string
}

// Clones mbsId into a fresh "R and D" draft child under mbhId. No overrides are
// sent for mbsMgtName/mbsDenier/mbsFilament — the backend derives the clone name
// as "<source> (copy)" and copies denier/filament as-is; there is no UI yet for
// overriding them (a "RND/Calculated/Actual" duplicate mechanism is undecided).
export async function duplicateMBSpin({ mbhId, mbsId }: DuplicateMBSpinInput): Promise<MBSpin> {
  const res = await fetch(`/api/v1/finance/mb-spins/${mbsId}/duplicate`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mbhId }),
  })
  const json = (await res.json()) as BFFEnvelope<MBSpin>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to duplicate MB Spin")
  }
  return json.data as MBSpin
}
