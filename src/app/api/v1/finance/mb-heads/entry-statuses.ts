// Parses the optional entry-status filter of the MB Head list BFF route.
// Accepts comma-separated (?entry_statuses=A,B) and/or repeated params, camelCase or snake_case.
// Unknown values are dropped here; the backend (buf.validate) is the real gate.

const ALLOWED = new Set(["DRAFT", "SUBMITTED", "APPROVED", "VALIDATED", "UN_APPROVED", "REVOKED", "REJECTED"])

export function parseEntryStatuses(searchParams: URLSearchParams): string[] {
    const raw = [...searchParams.getAll("entryStatuses"), ...searchParams.getAll("entry_statuses")]
    const out = raw
        .flatMap((v) => v.split(","))
        .map((v) => v.trim().toUpperCase())
        .filter((v) => ALLOWED.has(v))
    return [...new Set(out)]
}
