// MB Cross Section API service — master data CRUD plus the ORDERED
// (from_code -> to_code) conversion factor table. All calls go through the BFF
// routes under /api/v1/finance/master/... — never straight to the backend.

import {
  normalizeMbCrossSection,
  normalizeMbCrossSectionFactor,
  type ListMbCrossSectionParams,
  type ListMbCrossSectionFactorParams,
  type MbCrossSectionFormData,
  type MbCrossSectionFactorFormData,
  type NormalizedMbCrossSection,
  type NormalizedMbCrossSectionFactor,
  type RawMbCrossSection,
  type RawMbCrossSectionFactor,
} from "@/types/finance/mb-cross-section"

interface BFFEnvelope<T> {
  base?: { isSuccess?: boolean; message?: string }
  data?: T
  pagination?: { totalItems?: string; totalPages?: number; currentPage?: number; pageSize?: number }
}

const BASE = "/api/v1/finance/master/mb-cross-section"
const FACTOR_BASE = "/api/v1/finance/master/mb-cross-section-factor"

export interface ListResult<T> {
  items: T[]
  totalItems: number
  totalPages: number
  currentPage: number
  pageSize: number
}

function baseQuery(params: ListMbCrossSectionParams): URLSearchParams {
  const qs = new URLSearchParams()
  if (params.page) qs.set("page", String(params.page))
  if (params.pageSize) qs.set("pageSize", String(params.pageSize))
  if (params.search) qs.set("search", params.search)
  if (params.sortBy) qs.set("sortBy", params.sortBy)
  if (params.sortDir) qs.set("sortDir", params.sortDir)
  if (params.activeFilter) qs.set("activeFilter", String(params.activeFilter))
  return qs
}

// `totalItems` arrives as a string (int64 from proto) — always Number(...) it.
function toListResult<TRaw, TOut>(
  json: BFFEnvelope<TRaw[]>,
  normalize: (raw: TRaw) => TOut
): ListResult<TOut> {
  return {
    items: (json.data ?? []).map(normalize),
    totalItems: Number(json.pagination?.totalItems ?? 0),
    totalPages: Number(json.pagination?.totalPages ?? 0),
    currentPage: Number(json.pagination?.currentPage ?? 1),
    pageSize: Number(json.pagination?.pageSize ?? 10),
  }
}

function assertOk(json: BFFEnvelope<unknown>, fallback: string): void {
  if (json.base?.isSuccess === false) {
    throw new Error(json.base.message || fallback)
  }
}

// ============================================================================
// MB Cross Section (master)
// ============================================================================

export async function listMbCrossSections(
  params: ListMbCrossSectionParams = {}
): Promise<ListResult<NormalizedMbCrossSection>> {
  const res = await fetch(`${BASE}?${baseQuery(params).toString()}`, { credentials: "include" })
  const json = (await res.json()) as BFFEnvelope<RawMbCrossSection[]>
  assertOk(json, "Failed to load MB cross section list")
  return toListResult(json, normalizeMbCrossSection)
}

export async function getMbCrossSection(mbcsId: string): Promise<NormalizedMbCrossSection> {
  const res = await fetch(`${BASE}/${mbcsId}`, { credentials: "include" })
  const json = (await res.json()) as BFFEnvelope<RawMbCrossSection>
  assertOk(json, "Failed to load MB cross section")
  return normalizeMbCrossSection(json.data ?? {})
}

export async function createMbCrossSection(
  data: MbCrossSectionFormData
): Promise<NormalizedMbCrossSection> {
  const res = await fetch(BASE, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const json = (await res.json()) as BFFEnvelope<RawMbCrossSection>
  assertOk(json, "Failed to create MB cross section")
  return normalizeMbCrossSection(json.data ?? {})
}

export async function updateMbCrossSection(
  mbcsId: string,
  data: MbCrossSectionFormData
): Promise<NormalizedMbCrossSection> {
  const res = await fetch(`${BASE}/${mbcsId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const json = (await res.json()) as BFFEnvelope<RawMbCrossSection>
  assertOk(json, "Failed to update MB cross section")
  return normalizeMbCrossSection(json.data ?? {})
}

export async function deleteMbCrossSection(mbcsId: string): Promise<void> {
  const res = await fetch(`${BASE}/${mbcsId}`, { method: "DELETE", credentials: "include" })
  const json = (await res.json()) as BFFEnvelope<unknown>
  assertOk(json, "Failed to delete MB cross section")
}

// ============================================================================
// MB Cross Section Factor (directed pairs)
// ============================================================================

export async function listMbCrossSectionFactors(
  params: ListMbCrossSectionFactorParams = {}
): Promise<ListResult<NormalizedMbCrossSectionFactor>> {
  const qs = baseQuery(params)
  if (params.fromCode) qs.set("fromCode", params.fromCode)
  if (params.toCode) qs.set("toCode", params.toCode)
  const res = await fetch(`${FACTOR_BASE}?${qs.toString()}`, { credentials: "include" })
  const json = (await res.json()) as BFFEnvelope<RawMbCrossSectionFactor[]>
  assertOk(json, "Failed to load MB cross section factor list")
  return toListResult(json, normalizeMbCrossSectionFactor)
}

export async function getMbCrossSectionFactor(
  mbcfId: string
): Promise<NormalizedMbCrossSectionFactor> {
  const res = await fetch(`${FACTOR_BASE}/${mbcfId}`, { credentials: "include" })
  const json = (await res.json()) as BFFEnvelope<RawMbCrossSectionFactor>
  assertOk(json, "Failed to load MB cross section factor")
  return normalizeMbCrossSectionFactor(json.data ?? {})
}

export async function createMbCrossSectionFactor(
  data: MbCrossSectionFactorFormData
): Promise<NormalizedMbCrossSectionFactor> {
  const res = await fetch(FACTOR_BASE, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const json = (await res.json()) as BFFEnvelope<RawMbCrossSectionFactor>
  assertOk(json, "Failed to create MB cross section factor")
  return normalizeMbCrossSectionFactor(json.data ?? {})
}

export async function updateMbCrossSectionFactor(
  mbcfId: string,
  data: MbCrossSectionFactorFormData
): Promise<NormalizedMbCrossSectionFactor> {
  const res = await fetch(`${FACTOR_BASE}/${mbcfId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const json = (await res.json()) as BFFEnvelope<RawMbCrossSectionFactor>
  assertOk(json, "Failed to update MB cross section factor")
  return normalizeMbCrossSectionFactor(json.data ?? {})
}

export async function deleteMbCrossSectionFactor(mbcfId: string): Promise<void> {
  const res = await fetch(`${FACTOR_BASE}/${mbcfId}`, { method: "DELETE", credentials: "include" })
  const json = (await res.json()) as BFFEnvelope<unknown>
  assertOk(json, "Failed to delete MB cross section factor")
}
