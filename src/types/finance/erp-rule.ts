// ERP Rule types — loose raw types (camelCase + snake_case), normalized types, normalizers.
// Decimals (valLoss, price) stay strings.

type Loose = Record<string, unknown>

function pick(raw: Loose | null | undefined, camel: string, snake: string): unknown {
  if (!raw) return undefined
  return raw[camel] !== undefined ? raw[camel] : raw[snake]
}

const str = (v: unknown): string => (v === undefined || v === null ? "" : String(v))
const num = (v: unknown): number => (v === undefined || v === null || v === "" ? 0 : Number(v))
const bool = (v: unknown): boolean => v === true || v === "true"
const objList = (v: unknown): Loose[] => (Array.isArray(v) ? (v as Loose[]) : [])

export interface ValLossRule {
  id: number
  fgType: string
  prodType: string
  gradeGroup: string
  basis: string
  valLoss: string
  isActive: boolean
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
}

export function normalizeValLossRule(r: Loose): ValLossRule {
  return {
    id: num(r.id),
    fgType: str(pick(r, "fgType", "fg_type")),
    prodType: str(pick(r, "prodType", "prod_type")),
    gradeGroup: str(pick(r, "gradeGroup", "grade_group")),
    basis: str(r.basis),
    valLoss: str(pick(r, "valLoss", "val_loss")),
    isActive: bool(pick(r, "isActive", "is_active")),
    createdAt: str(pick(r, "createdAt", "created_at")),
    createdBy: str(pick(r, "createdBy", "created_by")),
    updatedAt: str(pick(r, "updatedAt", "updated_at")),
    updatedBy: str(pick(r, "updatedBy", "updated_by")),
  }
}

export interface SellPrice {
  basis: string
  price: string
  isActive: boolean
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
}

export function normalizeSellPrice(r: Loose): SellPrice {
  return {
    basis: str(r.basis),
    price: str(r.price),
    isActive: bool(pick(r, "isActive", "is_active")),
    createdAt: str(pick(r, "createdAt", "created_at")),
    createdBy: str(pick(r, "createdBy", "created_by")),
    updatedAt: str(pick(r, "updatedAt", "updated_at")),
    updatedBy: str(pick(r, "updatedBy", "updated_by")),
  }
}

export interface GradeGroup {
  gradeCode: string
  gradeName: string
  isActive: boolean
  /** empty = unassigned */
  gradeGroup: string
  assignedBy: string
}

export function normalizeGradeGroup(r: Loose): GradeGroup {
  return {
    gradeCode: str(pick(r, "gradeCode", "grade_code")),
    gradeName: str(pick(r, "gradeName", "grade_name")),
    isActive: bool(pick(r, "isActive", "is_active")),
    gradeGroup: str(pick(r, "gradeGroup", "grade_group")),
    assignedBy: str(pick(r, "assignedBy", "assigned_by")),
  }
}

export interface ChangeValue {
  name: string
  value: string
}

export interface RuleChange {
  subject: string
  kind: string
  key: string
  before: ChangeValue[]
  after: ChangeValue[]
}

const changeValues = (v: unknown): ChangeValue[] =>
  objList(v).map((c) => ({ name: str(c.name), value: str(c.value) }))

export function normalizeRuleChange(r: Loose): RuleChange {
  return {
    subject: str(r.subject),
    kind: str(r.kind),
    key: str(r.key),
    before: changeValues(r.before),
    after: changeValues(r.after),
  }
}
