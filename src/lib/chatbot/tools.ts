// Server-side only — never import from client components.
import { ToolDefinition } from "./deepseek-client"

// 10 READ-ONLY tools. userId is always injected server-side — not in tool args.
export const CHATBOT_TOOLS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "get_product_requests",
      description: "List cost product requests (CPR) with optional filters. Returns up to 20 items.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status: DRAFT, SUBMITTED, APPROVED, REJECTED, CLOSED" },
          dateFrom: { type: "string", description: "ISO date filter from (YYYY-MM-DD)" },
          dateTo: { type: "string", description: "ISO date filter to (YYYY-MM-DD)" },
          search: { type: "string", description: "Search by request number or product name" },
          limit: { type: "number", description: "Max results, max 20", minimum: 1, maximum: 20 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_product_request_detail",
      description: "Get full detail of a single cost product request including participants and current status.",
      parameters: {
        type: "object",
        properties: {
          requestId: { type: "string", description: "UUID of the CPR" },
          requestNo: { type: "string", description: "Request number (e.g. CPR-2026-001)" },
        },
        oneOf: [{ required: ["requestId"] }, { required: ["requestNo"] }],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_cost_results",
      description: "Get cost calculation results for a product.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "UUID of the product" },
          period: { type: "string", description: "Period in YYYYMM format (e.g. 202606)" },
          requestId: { type: "string", description: "UUID of the CPR (optional)" },
        },
        required: ["productId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_master_products",
      description: "Search master products by name or category.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Search by product name or code" },
          category: { type: "string", description: "Filter by product category" },
          limit: { type: "number", minimum: 1, maximum: 20 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pending_fill_params",
      description: "Get parameters that are pending fill-in assignment.",
      parameters: {
        type: "object",
        properties: {
          requestId: { type: "string", description: "Filter by CPR UUID" },
          assigneeUserId: { type: "string", description: "Filter by assigned user UUID" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pending_approvals",
      description: "Get items pending approval for the current user.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["CPR", "FILL", "ALL"],
            description: "Type of approval to query",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_online_users",
      description: "Get list of users currently online in the system.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_parameter_values",
      description: "Get costing parameter values for a product.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "UUID of the product" },
          paramCode: { type: "string", description: "Parameter code to filter" },
          period: { type: "string", description: "Period YYYYMM" },
        },
        required: ["productId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_formula_definitions",
      description: "Get formula definitions used in cost calculation.",
      parameters: {
        type: "object",
        properties: {
          formulaCode: { type: "string", description: "Specific formula code" },
          search: { type: "string", description: "Search by formula name or code" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "track_request_status",
      description: "Get status change history for a cost product request.",
      parameters: {
        type: "object",
        properties: {
          requestId: { type: "string", description: "UUID of the CPR" },
          requestNo: { type: "string", description: "Request number" },
        },
        oneOf: [{ required: ["requestId"] }, { required: ["requestNo"] }],
      },
    },
  },
]
