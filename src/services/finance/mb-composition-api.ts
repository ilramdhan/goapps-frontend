// MB Composition API service — composition lines + version snapshots for an MB Head

import type {
  MbComposition,
  MbCompositionVersion,
  ListMbCompositionsParams,
  ListMbCompositionVersionsParams,
  MbCompositionFormData,
} from "@/types/finance/mb-composition"

interface BFFEnvelope<T> {
  base?: { isSuccess?: boolean; message?: string }
  data?: T
}

const BASE = "/api/v1/finance/mb-compositions"

export async function listMbCompositions(params: ListMbCompositionsParams): Promise<MbComposition[]> {
  const qs = new URLSearchParams({ mbhId: params.mbhId })
  const res = await fetch(`${BASE}?${qs.toString()}`, { credentials: "include" })
  const json = (await res.json()) as BFFEnvelope<MbComposition[]>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to load MB compositions")
  }
  return json.data ?? []
}

export async function listMbCompositionVersions(
  params: ListMbCompositionVersionsParams,
): Promise<MbCompositionVersion[]> {
  const qs = new URLSearchParams({ mbhId: params.mbhId })
  if (params.version) qs.set("version", String(params.version))
  const res = await fetch(`${BASE}/versions?${qs.toString()}`, { credentials: "include" })
  const json = (await res.json()) as BFFEnvelope<MbCompositionVersion[]>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to load MB composition versions")
  }
  return json.data ?? []
}

export async function createMbComposition(data: MbCompositionFormData): Promise<MbComposition> {
  const res = await fetch(BASE, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const json = (await res.json()) as BFFEnvelope<MbComposition>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to create MB composition line")
  }
  return json.data as MbComposition
}

export async function updateMbComposition(
  mbcmId: string,
  data: Omit<MbCompositionFormData, "mbhId" | "seqNo">,
): Promise<MbComposition> {
  const res = await fetch(`${BASE}/${mbcmId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const json = (await res.json()) as BFFEnvelope<MbComposition>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to update MB composition line")
  }
  return json.data as MbComposition
}

export async function deleteMbComposition(mbcmId: string): Promise<void> {
  const res = await fetch(`${BASE}/${mbcmId}`, {
    method: "DELETE",
    credentials: "include",
  })
  const json = (await res.json()) as BFFEnvelope<unknown>
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || "Failed to delete MB composition line")
  }
}
