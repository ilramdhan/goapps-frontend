// Server-side only — never import from client components.
// Calls finance/IAM BFF routes (/api/v1/*) over HTTP; never talks to gRPC directly.
import { z } from "zod"

export interface ToolResult {
  data?: unknown
  error?: string
}

// Zod schemas per tool (Layer 5: tool arg validation)
const schemas: Record<string, z.ZodTypeAny> = {
  get_product_requests: z.object({
    status: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    search: z.string().optional(),
    limit: z.number().min(1).max(20).optional(),
  }),
  get_product_request_detail: z
    .object({
      requestId: z.string().uuid().optional(),
      requestNo: z.string().optional(),
    })
    .refine((v) => v.requestId || v.requestNo, { message: "requestId or requestNo required" }),
  get_cost_results: z.object({
    productId: z.string().uuid(),
    period: z
      .string()
      .regex(/^\d{6}$/)
      .optional(),
    requestId: z.string().uuid().optional(),
  }),
  get_master_products: z.object({
    search: z.string().optional(),
    category: z.string().optional(),
    limit: z.number().min(1).max(20).optional(),
  }),
  get_pending_fill_params: z.object({
    requestId: z.string().uuid().optional(),
    assigneeUserId: z.string().uuid().optional(),
  }),
  get_pending_approvals: z.object({
    type: z.enum(["CPR", "FILL", "ALL"]).optional(),
  }),
  get_online_users: z.object({}),
  get_parameter_values: z.object({
    productId: z.string().uuid(),
    paramCode: z.string().optional(),
    period: z
      .string()
      .regex(/^\d{6}$/)
      .optional(),
  }),
  get_formula_definitions: z.object({
    formulaCode: z.string().optional(),
    search: z.string().optional(),
  }),
  track_request_status: z
    .object({
      requestId: z.string().uuid().optional(),
      requestNo: z.string().optional(),
    })
    .refine((v) => v.requestId || v.requestNo, { message: "requestId or requestNo required" }),
}

// Tool implementations — all READ-ONLY. userId is injected from JWT server-side,
// not from tool args (Layer 7: context isolation).
const toolHandlers: Record<string, (args: unknown, userId: string) => Promise<unknown>> = {
  get_product_requests: async (args, userId) => {
    const a = args as { status?: string; dateFrom?: string; dateTo?: string; search?: string; limit?: number }
    const params = new URLSearchParams()
    if (a.status) params.set("status", a.status)
    if (a.dateFrom) params.set("date_from", a.dateFrom)
    if (a.dateTo) params.set("date_to", a.dateTo)
    if (a.search) params.set("search", a.search)
    params.set("page_size", String(a.limit ?? 10))
    params.set("_chatbot_user_id", userId) // BFF reads this to enforce RBAC
    const res = await fetch(`/api/v1/finance/cost-product-requests?${params}`)
    return res.json()
  },

  get_product_request_detail: async (args, userId) => {
    const a = args as { requestId?: string; requestNo?: string }
    const id = a.requestId ?? a.requestNo
    const res = await fetch(`/api/v1/finance/cost-product-requests/${id}?_chatbot_user_id=${userId}`)
    return res.json()
  },

  get_cost_results: async (args, userId) => {
    const a = args as { productId: string; period?: string; requestId?: string }
    const params = new URLSearchParams({ product_id: a.productId })
    if (a.period) params.set("period", a.period)
    if (a.requestId) params.set("request_id", a.requestId)
    params.set("_chatbot_user_id", userId)
    const res = await fetch(`/api/v1/finance/cost-results?${params}`)
    return res.json()
  },

  get_master_products: async (args, userId) => {
    const a = args as { search?: string; category?: string; limit?: number }
    const params = new URLSearchParams()
    if (a.search) params.set("search", a.search)
    if (a.category) params.set("category", a.category)
    params.set("page_size", String(a.limit ?? 10))
    params.set("_chatbot_user_id", userId)
    const res = await fetch(`/api/v1/finance/products?${params}`)
    return res.json()
  },

  get_pending_fill_params: async (args, userId) => {
    const a = args as { requestId?: string; assigneeUserId?: string }
    const params = new URLSearchParams({ assignee_user_id: a.assigneeUserId ?? userId })
    if (a.requestId) params.set("request_id", a.requestId)
    const res = await fetch(`/api/v1/finance/fill-assignments?${params}`)
    return res.json()
  },

  get_pending_approvals: async (args, userId) => {
    const a = args as { type?: string }
    const res = await fetch(`/api/v1/finance/approvals/pending?type=${a.type ?? "ALL"}&user_id=${userId}`)
    return res.json()
  },

  get_online_users: async (_args, _userId) => {
    const res = await fetch("/api/v1/iam/presence/online")
    return res.json()
  },

  get_parameter_values: async (args, userId) => {
    const a = args as { productId: string; paramCode?: string; period?: string }
    const params = new URLSearchParams({ product_id: a.productId })
    if (a.paramCode) params.set("param_code", a.paramCode)
    if (a.period) params.set("period", a.period)
    params.set("_chatbot_user_id", userId)
    const res = await fetch(`/api/v1/finance/cost-product-params?${params}`)
    return res.json()
  },

  get_formula_definitions: async (args, _userId) => {
    const a = args as { formulaCode?: string; search?: string }
    const params = new URLSearchParams()
    if (a.formulaCode) params.set("formula_code", a.formulaCode)
    if (a.search) params.set("search", a.search)
    const res = await fetch(`/api/v1/finance/formulas?${params}`)
    return res.json()
  },

  track_request_status: async (args, userId) => {
    const a = args as { requestId?: string; requestNo?: string }
    const id = a.requestId ?? a.requestNo
    const res = await fetch(`/api/v1/finance/cpr/history/${id}?_chatbot_user_id=${userId}`)
    return res.json()
  },
}

// executeTool: validates args with Zod, then calls handler.
// userId is always injected from JWT — never from tool args.
export async function executeTool(toolName: string, args: unknown, userId: string): Promise<ToolResult> {
  const schema = schemas[toolName]
  if (!schema) return { error: `Unknown tool: ${toolName}` }

  const parsed = schema.safeParse(args)
  if (!parsed.success) {
    return { error: `Validation error for ${toolName}: ${parsed.error.message}` }
  }

  const handler = toolHandlers[toolName]
  if (!handler) return { error: `No handler for tool: ${toolName}` }

  try {
    const data = await handler(parsed.data, userId)
    return { data }
  } catch (err) {
    return { error: `Tool ${toolName} failed: ${err instanceof Error ? err.message : String(err)}` }
  }
}
