# CLAUDE.md — GoApps Frontend UI Standards & Conventions

> **Last updated**: 2026-06-15 — Design system docs added. Typography conflict resolved. All component rules now in DESIGN.md.
> This file is the single source of truth for **architecture and patterns**. Read this first, then follow the design system docs for visual decisions.

---

## Design System Docs (read these before generating UI)

| Document | What's inside | When to read |
|----------|---------------|--------------|
| [`docs/design-system/DESIGN.md`](./docs/design-system/DESIGN.md) | Design tokens, typography canonical, all components A–Z (Button, Card, Badge, Table, Dialog, Form fields, Combobox, Radio, Slider, Switch, Timeline, Toast, Tooltip, etc.) | Before building any component or page UI |
| [`docs/design-system/LAYOUT.md`](./docs/design-system/LAYOUT.md) | Responsive breakpoints, dashboard shell anatomy, overflow/scroll rules, list/detail/dashboard page patterns, mobile rules, sticky elements, common bug fixes | Before building any page layout |
| [`docs/design-system/RULES.md`](./docs/design-system/RULES.md) | AI generation checklist, cardinal rules, decision trees (typography/component/layout), do/don't tables, page scaffold templates, common mistakes | Quick reference during code generation |

### The 10 Cardinal Rules (from RULES.md §1)

1. `CardTitle` **always** `className="text-sm font-semibold"` — never without the class
2. **Never** `<Badge>` for entity status — always `<StatusBadge status={x} type={...} />`
3. **Never** modify `src/components/ui/` — extend via `components/common/` or `components/shared/`
4. `min-w-0` on every flex parent in the main layout path — prevents horizontal page overflow
5. Tables inside `overflow-x-auto` — `DataTable` handles this; custom tables must wrap manually
6. `flex-wrap` on every action bar — `flex flex-wrap items-center gap-2`
7. `loading={isLoading}` on every `KpiCard` — always
8. `Number(totalItems)` always — proto returns `totalItems` as string
9. `form.reset()` in `useEffect([open, target])` — always reset form on dialog open
10. **Never** `window.confirm()` — always `<ConfirmDialog>` for destructive actions

### Known Conflict (MUST FIX when touching typography.ts)

`src/lib/ui/typography.ts` has an incorrect `cardTitle` value:
```ts
// ✗ Current (WRONG):
cardTitle: "text-sm font-medium text-muted-foreground",

// ✓ Correct (matches reference page):
cardTitle: "text-sm font-semibold",
```
Until fixed, **do not use `typography.cardTitle`** for `CardTitle`. Always use `className="text-sm font-semibold"` directly.

---

## Table of Contents

1. [Build & Dev Commands](#1-build--dev-commands)
2. [Architecture Overview](#2-architecture-overview)
3. [Directory Structure](#3-directory-structure)
4. [Page Patterns](#4-page-patterns)
5. [Card & Typography Conventions](#5-card--typography-conventions)
6. [Shared Component Catalog](#6-shared-component-catalog)
7. [Form Patterns](#7-form-patterns)
8. [Dialog & Drawer Patterns](#8-dialog--drawer-patterns)
9. [Table & Pagination Patterns](#9-table--pagination-patterns)
10. [Hook Patterns](#10-hook-patterns)
11. [Types & Normalizer Pattern](#11-types--normalizer-pattern)
12. [BFF API Route Pattern](#12-bff-api-route-pattern)
13. [Loading & Skeleton Pattern](#13-loading--skeleton-pattern)
14. [Status & Enum Display](#14-status--enum-display)
15. [User Display](#15-user-display)
16. [Critical Rules & Don'ts](#16-critical-rules--donts)

---

## 1. Build & Dev Commands

```bash
npm run dev              # Dev server on :3000
npm run build            # Production build (also runs tsc)
npm run lint             # ESLint
npm run test             # Vitest watch mode
npm run test:run         # Single run
npm run test:coverage    # Coverage report
npx tsc --noEmit         # Type-check only — run after every significant change
npx shadcn@latest add [name]  # Add shadcn/ui component
```

### Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | 16.x | Framework (App Router) |
| react | 19.x | UI library |
| @tanstack/react-query | 5.x | Server state |
| zustand | 5.x | Client state |
| react-hook-form | 7.x | Forms |
| zod | 3.x | Validation |
| @grpc/grpc-js | 1.x | gRPC client (BFF) |
| tailwindcss | 4.x | Styling |
| sonner | — | Toast notifications |
| lucide-react | — | Icons |
| recharts | — | Charts |

### Testing Stack

- Vitest + Testing Library + MSW (Mock Service Worker)
- Setup file: `src/__tests__/setup.ts` — auto-cleanup, MSW server, `matchMedia`/`ResizeObserver` mocks
- Test files: `src/__tests__/**/*.test.{ts,tsx}`
- Current coverage: query-key unit tests + component filter tests (see §Improvement Notes for gaps)

### Environment Variables (`.env.local`)

```bash
# gRPC endpoints (server-side only, NOT exposed to the browser)
IAM_GRPC_HOST=localhost
IAM_GRPC_PORT=50052
FINANCE_GRPC_HOST=localhost
FINANCE_GRPC_PORT=50051

# Public variables (exposed to the browser)
NEXT_PUBLIC_API_URL=           # Leave empty for relative paths (recommended)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 2. Architecture Overview

**Stack**: Next.js 16 (App Router) · React 19 · TailwindCSS 4 · shadcn/ui · TanStack Query · Zustand · React Hook Form · Zod

### Data Flow (BFF)

```
Browser → React (TanStack Query hooks)
  → Next.js API routes /api/v1/*  ← BFF layer, handles auth headers
    → gRPC (@grpc/grpc-js) → Go microservices → PostgreSQL/Redis
```

The frontend **never** calls the Go backend directly. All requests go through `/api/v1/*` BFF routes.

### Provider Stack

```
QueryProvider → ThemeProvider → AuthProvider → PermissionProvider → {children}
```

- `AuthProvider` — user state, login/logout, auto token refresh every 10 min, **plus a silent refresh on mount** (attempts a token refresh once when the app loads, ahead of the 10-min interval)
- `PermissionProvider` — `hasPermission(code)`, `hasAnyRole(...roles)`
- `QueryProvider` — TanStack Query client (staleTime 60s, refetchOnWindowFocus false)

### Route Protection (`src/proxy.ts`)

Next.js 16 route protection (replaces the old `middleware.ts`):

- **Public routes**: `/login`, `/forgot-password`, `/reset-password`, `/verify-otp`
- **Protected routes**: everything else — redirect to `/login?callbackUrl=...` when unauthenticated
- **API routes**: pass through untouched — each BFF route handles its own auth
- Auth check is based on the presence of `access_token` + `refresh_token` cookies

### Dynamic Sidebar System

The sidebar is **fully dynamic** — driven by database menu data, not a hardcoded nav config:

1. Backend `GetMenuTree` RPC returns hierarchical menu data already filtered by the current user's permissions
2. BFF route `/api/v1/iam/menus/tree` proxies the RPC
3. `useMenuTree()` hook (`src/hooks/iam/use-menu.ts`) fetches the tree → `menuTreeToNavGroups()` converts it to sidebar nav-group shape
4. Icons lazy-load via `preloadMenuIcons()` + `resolveIcon()` in `src/types/iam/menu.ts` (dynamic imports from `lucide-react`)
5. `AppSidebar` renders the resulting nav groups

**Menu permission visibility rule**: a menu with **no** rows in `menu_permissions` is visible to **all** authenticated users; a menu **with** rows requires the user to hold at least one matching permission. Parent menus filtered out by permission drop their children too — `buildMenuTree()` only keeps children under a parent that itself survived the filter.

---

## 3. Directory Structure

```
src/
├── app/
│   ├── (auth)/                    # Login, forgot-password, reset-password
│   ├── (dashboard)/               # All protected pages
│   │   ├── layout.tsx             # SidebarProvider + AppSidebar + Header
│   │   ├── finance/
│   │   │   ├── uom/               # Reference: simplest list page
│   │   │   └── product-requests/  # Reference: list + detail + nested workflow
│   │   └── iam/
│   │       ├── users/             # Reference: list with roles + permissions
│   │       └── menus/             # Reference: tree view
│   └── api/v1/                    # BFF API routes (server-only)
│       ├── finance/uoms/          # route.ts (list+create) + [id]/route.ts (get/put/delete)
│       └── iam/users/
├── components/
│   ├── ui/                        # shadcn/ui — DO NOT MODIFY
│   ├── common/                    # Generic reusable: PageHeader, EmptyState, StatusBadge…
│   ├── shared/                    # Feature-generic: DataTable, ConfirmDialog, FormDialog…
│   ├── finance/                   # Finance module components
│   ├── iam/                       # IAM module components
│   └── loading/                   # Skeleton loaders
├── hooks/
│   ├── finance/                   # use-uom.ts, use-cost-product-request.ts…
│   └── iam/                       # use-users.ts, use-menu.ts…
├── lib/
│   ├── grpc/clients.ts            # gRPC client singletons
│   ├── grpc/errors.ts             # gRPC → HTTP status mapping
│   ├── hooks/
│   │   ├── create-crud-hooks.ts   # CRUD hook factory
│   │   ├── use-url-state.ts       # URL ↔ filter state sync
│   │   └── use-debounce.ts
│   └── ui/
│       └── status-colors.ts       # Status → variant/label registry
├── providers/                     # React context providers
├── stores/                        # Zustand stores (sidebar, auth)
└── types/
    ├── generated/                 # Proto-generated TS — DO NOT EDIT
    ├── finance/uom.ts             # Normalized types + parsers + form types
    └── iam/
```

---

## 4. Page Patterns

### 4.1 List Page (Master Data / Transaction)

**Reference implementation**: `src/app/(dashboard)/finance/uom/`

**File structure for every list page:**

```
app/(dashboard)/{module}/{resource}/
├── page.tsx              # Server component — metadata only, delegates to client
├── loading.tsx           # Route-level skeleton (always required)
└── {resource}-page-client.tsx   # "use client" — all state & rendering
```

**`page.tsx`** — always this shape:
```tsx
import { genMeta } from "@/lib/metadata"
import { UomPageClient } from "./uom-page-client"

export const metadata = genMeta("Unit of Measure")
export default function UomPage() {
  return <UomPageClient />
}
```

**`{resource}-page-client.tsx`** — canonical structure:
```tsx
"use client"

export function UomPageClient() {
  // 1. URL state for filters (synced to browser URL)
  const [filters, setFilters] = useUrlState<ListUOMsParams>({
    defaultValues: { page: 1, pageSize: 10, search: "" }
  })

  // 2. Data + mutations
  const { data, isLoading, isError } = useUOMs(filters)
  const createM = useCreateUOM()
  const updateM = useUpdateUOM()
  const deleteM = useDeleteUOM()

  // 3. Local dialog/selection state
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<UOM | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UOM | null>(null)

  return (
    <div className="space-y-6">
      <PageHeader title="Unit of Measure" subtitle="Manage units used in costing">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add UOM
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>UOM List</CardTitle>
          <CardDescription>All active and inactive units of measure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <UomFilters filters={filters} onChange={setFilters} />
          {isError && <ErrorMessage />}
          <UomTable data={data?.items ?? []} isLoading={isLoading}
            onEdit={setEditTarget} onDelete={setDeleteTarget} />
          <DataTablePagination
            currentPage={filters.page ?? 1}
            pageSize={filters.pageSize ?? 10}
            totalItems={data?.totalItems ?? 0}
            totalPages={data?.totalPages ?? 0}
            onPageChange={(page) => setFilters({ ...filters, page })}
            onPageSizeChange={(pageSize) => setFilters({ ...filters, pageSize, page: 1 })}
          />
        </CardContent>
      </Card>

      <UomFormDialog open={createOpen || !!editTarget}
        uom={editTarget} onClose={() => { setCreateOpen(false); setEditTarget(null) }} />
      <ConfirmDialog open={!!deleteTarget} title="Delete UOM"
        description={`Delete "${deleteTarget?.uomName}"?`}
        onConfirm={() => { deleteM.mutate(deleteTarget!.uomId); setDeleteTarget(null) }}
        onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}
```

### 4.2 Detail Page (Transaction / Entity Detail)

**Reference implementation**: `src/app/(dashboard)/finance/product-requests/[requestId]/`

**File structure:**

```
app/(dashboard)/{module}/{resource}/[id]/
├── page.tsx              # Server component — extracts params, passes to client
├── loading.tsx           # Skeleton
└── detail-client.tsx     # "use client" — receives id as prop
```

**`page.tsx`**:
```tsx
export default async function ProductRequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>
}) {
  const { requestId } = await params   // always await params in Next.js 16
  return <DetailClient requestId={Number(requestId)} />
}
```

**`detail-client.tsx`** — canonical structure:
```tsx
"use client"

export function DetailClient({ requestId }: { requestId: number }) {
  const { data, isLoading } = useCostProductRequest(requestId)

  if (isLoading) return <DetailSkeleton />
  if (!data) return <EmptyState title="Not found" ... />

  return <RequestDetailPanel request={data} />
}
```

**Detail page layout** — two-column bento grid (reference: `request-detail-panel.tsx`):
```tsx
<div className="space-y-6">
  {/* Action bar — status-gated buttons */}
  <div className="flex flex-wrap gap-2">...</div>

  {/* Bento grid */}
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
    {/* Left column — main content */}
    <div className="lg:col-span-8 space-y-6">
      <Card>/* Main header card — title, key fields, description */</Card>
      <Card>/* Product spec or domain-specific data */</Card>
      <Card>/* Review/assessment (conditional) */</Card>
      <CommentsPanel requestId={id} />
    </div>

    {/* Right column — contextual sidebar */}
    <div className="lg:col-span-4 space-y-6">
      <Card>/* Timeline / trace */</Card>
      <Card>/* Fill tracking / workflow status (conditional) */</Card>
      <Card>/* Routing / linked entities (conditional) */</Card>
      <AttachmentsPanel requestId={id} />
    </div>
  </div>
</div>
```

**Detail page content ordering (left column):**
1. Header card — request no (monospace), title, status badge, key metadata fields grid, description (inline, below fields)
2. Domain-specific spec card (e.g., product specification)
3. Review/assessment card (only if data exists — use conditional rendering)
4. Reject/cancel reason cards (terminal state only, `border-destructive/40`)
5. CommentsPanel (always last in left column)

---

## 5. Card & Typography Conventions

These rules apply to **every** card on every page. Consistency is mandatory.

### Card Title

```tsx
<CardHeader>
  <CardTitle className="text-sm font-semibold">Card title</CardTitle>
</CardHeader>
```

- Always `text-sm font-semibold` — never `text-base`, never `uppercase tracking-wide`
- **No uppercase, no letter-spacing** — those are reserved for field labels inside cards

### Card Header with Right Slot (badge or action)

```tsx
<CardHeader className="flex flex-row items-center justify-between space-y-0">
  <CardTitle className="text-sm font-semibold">Fill tracking</CardTitle>
  <span className="text-xs text-muted-foreground">3/5 approved</span>
</CardHeader>
```

- Add `flex flex-row items-center justify-between space-y-0` when the right slot exists
- Right slot: small badge, count, or ghost/outline `size="sm"` button only — no large buttons

### Card Header with Subtitle

```tsx
<CardHeader>
  <CardTitle className="text-sm font-semibold">Attachments</CardTitle>
  <p className="text-xs text-muted-foreground">Max 25 MB per file.</p>
</CardHeader>
```

### Card Header with Right Button + Subtitle

```tsx
<CardHeader className="flex flex-row items-start justify-between space-y-0">
  <div>
    <CardTitle className="text-sm font-semibold">Attachments</CardTitle>
    <p className="mt-1 text-xs text-muted-foreground">Max 25 MB per file.</p>
  </div>
  <AttachmentUploader requestId={requestId} label="Upload" />
</CardHeader>
```

### shadcn Default Padding (do not override unless justified)

| Slot | Default class | Override |
|------|--------------|---------|
| `CardHeader` | `p-6` | Only override if confirmed necessary |
| `CardContent` | `p-6 pt-0` | Use `className="space-y-4"` for vertical rhythm |
| `CardFooter` | `p-6 pt-0` | — |

### Field Label Inside Card

```tsx
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
```

- Field labels: `text-xs text-muted-foreground` — plain sentence case, not uppercase
- Section labels inside a card (e.g., "Classification", "Feasibility"): `text-xs uppercase tracking-wide text-muted-foreground`

### Main Header Card (detail pages)

```tsx
<Card>
  <CardHeader>
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground font-mono">{request.requestNo}</div>
        <CardTitle>{request.title}</CardTitle>
      </div>
      <StatusBadge status={status} type="request" size="lg" />
    </div>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
      <Field label="Type">...</Field>
      <Field label="Urgency">...</Field>
    </div>
    {description && (
      <div className="border-t pt-4">
        <p className="text-xs text-muted-foreground mb-1">Description</p>
        <p className="text-sm whitespace-pre-wrap">{description}</p>
      </div>
    )}
  </CardContent>
</Card>
```

---

## 6. Shared Component Catalog

### 6.1 PageHeader

**File**: `src/components/common/page-header.tsx`

```tsx
<PageHeader title="Unit of Measure" subtitle="Manage units used in costing">
  <Button onClick={handleAdd}><Plus className="mr-2 h-4 w-4" /> Add UOM</Button>
</PageHeader>
```

- `title` — page name, rendered as `lg:text-xl font-bold`
- `subtitle` — `text-sm text-muted-foreground`
- `children` — action buttons, right-aligned on desktop

### 6.2 EmptyState

**File**: `src/components/common/empty-state.tsx`

```tsx
<EmptyState
  title="No UOMs found"
  description="Try adjusting your search filters."
  action={<Button onClick={() => setCreateOpen(true)}>Add First UOM</Button>}
/>
```

Centered dashed-border box. Use whenever a list or section has no data.

### 6.3 StatusBadge

**File**: `src/components/common/status-badge.tsx`
**Registry**: `src/lib/ui/status-colors.ts`

```tsx
<StatusBadge status={request.status} type="request" />
<StatusBadge status={job.status} type="job" size="sm" />
```

- Always use `StatusBadge` — never render raw `<Badge>` for entity statuses
- `type` maps to a registry entry that provides the label + visual variant
- Available types: `"request"` `"route"` `"job"` `"chunk"` `"cost"` `"product"` `"generic"`
- Add new statuses to the registry in `status-colors.ts`, not inline

### 6.4 KpiCard / KpiGrid

**Files**: `src/components/common/kpi-card.tsx`, `src/components/common/kpi-grid.tsx`

```tsx
<KpiGrid cols={4}>
  <KpiCard title="Total Requests" value={data?.totalItems ?? 0} icon={FileText} loading={isLoading} />
  <KpiCard title="Approved" value={approved} variant="success" />
  <KpiCard title="Pending" value={pending} variant="warning" />
  <KpiCard title="Rejected" value={rejected} variant="destructive" />
</KpiGrid>
```

- Use for dashboard KPI summary rows at the top of list/overview pages
- `loading={true}` shows skeleton — always pass `loading={isLoading}`
- `variant`: `"default"` `"success"` `"warning"` `"destructive"`

### 6.5 DebouncedSearchInput

**File**: `src/components/common/debounced-search-input.tsx`

```tsx
<DebouncedSearchInput
  value={filters.search || ""}
  onValueChange={(search) => setFilters({ ...filters, search, page: 1 })}
  placeholder="Search by code or name…"
  debounceMs={300}
/>
```

- Always reset `page: 1` when search changes
- Never use a plain `<Input>` with `onChange` for search — it causes keystroke lag

### 6.6 UserName

**File**: `src/components/common/user-name.tsx`

```tsx
<UserName userId={request.requesterUserId} />          // "Ilham Ramadhan (@ilham)"
<UserName userId={request.requesterUserId} compact />  // "Ilham Ramadhan"
```

- Resolves UUID → full name via `useUser()` hook (TanStack Query, cached)
- Never display raw UUIDs to users

### 6.7 UserAvatar (photo or initials)

**File**: `src/components/common/user-avatar.tsx`

```tsx
import { UserAvatar } from "@/components/common/user-avatar"

<UserAvatar userId={comment.authorUserId} colorHash className="mt-0.5 shrink-0" />
```

- Resolves full name + `profilePictureUrl` via `useUser()` → renders the real photo (`AvatarImage`) when set, else falls back to initials ("Ilham Ramadhan" → "IR")
- `colorHash` prop enables the deterministic color-per-userId fallback (hash-based from 6-color palette); omit it to use the plain shadcn muted fallback (used by `nav-user.tsx`/`profile-header.tsx`)
- Falls back to first char of userId if name not yet resolved
- Supersedes the former `UserInitials` component (removed 2026-07-03) — same hook, same deterministic-color logic, now also renders a real photo when available

### 6.8 ScrollableDialog (tall forms)

**File**: `src/components/common/scrollable-dialog.tsx`

Use when a form dialog is tall enough to overflow the viewport:

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <ScrollableDialogContent className="sm:max-w-[560px]">
    <ScrollableDialogHeader>
      <DialogTitle>Edit User</DialogTitle>
      <DialogDescription>Update user details and roles.</DialogDescription>
    </ScrollableDialogHeader>
    <ScrollableDialogBody>
      {/* form fields */}
    </ScrollableDialogBody>
    <ScrollableDialogFooter>
      <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
      <Button type="submit" disabled={isPending}>Save</Button>
    </ScrollableDialogFooter>
  </ScrollableDialogContent>
</Dialog>
```

- Header and footer are **sticky** (stay visible while body scrolls)
- Max height 90vh with overflow-y-auto on body
- Use `ScrollableDialogContent` instead of `DialogContent` for any form with 6+ fields

---

## 7. Form Patterns

**Stack**: `react-hook-form` + `zod` + `@hookform/resolvers/zod` + shadcn Form components

### Schema Definition

```ts
const formSchema = z.object({
  uomCode: z.string()
    .min(1, "Code is required")
    .max(20)
    .regex(/^[A-Z][A-Z0-9_]*$/, "Uppercase letters, digits, underscores only"),
  uomName: z.string().min(1, "Name is required").max(100),
  isActive: z.boolean().default(true),
})
type FormValues = z.infer<typeof formSchema>
```

### Form Component

```tsx
const form = useForm<FormValues>({
  resolver: zodResolver(formSchema) as never,
  defaultValues: { uomCode: "", uomName: "", isActive: true },
})

// Reset when dialog opens/target changes
useEffect(() => {
  form.reset(uom ? { uomCode: uom.uomCode, uomName: uom.uomName, isActive: uom.isActive }
                 : { uomCode: "", uomName: "", isActive: true })
}, [uom, open])

async function onSubmit(values: FormValues) {
  try {
    if (uom) await updateM.mutateAsync({ id: uom.uomId, ...values })
    else await createM.mutateAsync(values)
    onClose()
  } catch { /* toast in hook */ }
}
```

### Field Template

```tsx
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
    <FormField
      control={form.control}
      name="uomCode"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Code <span className="text-destructive">*</span></FormLabel>
          <FormControl>
            <Input placeholder="e.g., KG" {...field}
              onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
          </FormControl>
          <FormDescription>Uppercase, max 20 chars.</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

### Submit Button Pattern

```tsx
<Button type="submit" disabled={createM.isPending || updateM.isPending}>
  {(createM.isPending || updateM.isPending) && (
    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  )}
  {uom ? "Update" : "Create"}
</Button>
```

---

## 8. Dialog & Drawer Patterns

### 8.1 Standard CRUD Dialog

Use standard `<Dialog>` (not ScrollableDialog) for short forms (≤ 5 fields):

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-[480px]">
    <DialogHeader>
      <DialogTitle>{uom ? "Edit UOM" : "Add UOM"}</DialogTitle>
    </DialogHeader>
    {/* form */}
    <DialogFooter>
      <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
      <Button type="submit" form="uom-form">Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 8.2 Tall Form Dialog (ScrollableDialog)

Use for forms with 6+ fields or complex nested sections. See §6.8.

### 8.3 Confirm / Delete Dialog

**File**: `src/components/shared/confirm-dialog/confirm-dialog.tsx`

```tsx
<ConfirmDialog
  open={!!deleteTarget}
  title="Delete UOM"
  description={`"${deleteTarget?.uomName}" will be permanently deleted.`}
  confirmLabel="Delete"
  confirmVariant="destructive"
  isLoading={deleteM.isPending}
  onConfirm={() => deleteM.mutate(deleteTarget!.uomId)}
  onCancel={() => setDeleteTarget(null)}
/>
```

Always use `ConfirmDialog` for destructive actions — never use `window.confirm()`.

### 8.4 Drawer (Sheet) — Embedded Workflow UI

Use when an action opens a complex secondary UI that benefits from staying in context (e.g., filling parameters without navigating away).

**Reference**: `src/components/finance/fill-assignment/FillParamDrawer.tsx`

Layout rules for drawers:
```tsx
<Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent
    side="right"
    showCloseButton={false}          // suppress default X — we add our own
    className="flex flex-col p-0 w-full sm:max-w-2xl gap-0"
  >
    {/* Sticky header */}
    <div className="flex shrink-0 items-start gap-3 border-b bg-background px-6 py-4">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="font-mono text-xs font-normal">REQ-{id}</Badge>
          <StatusBadge status={status} type="request" />
        </div>
        <SheetTitle className="text-base font-semibold leading-tight">Title here</SheetTitle>
        <SheetDescription className="text-xs text-muted-foreground">Subtitle</SheetDescription>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={onClose}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back to request
        </Button>
        <SheetClose asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <X className="h-4 w-4" /><span className="sr-only">Close</span>
          </Button>
        </SheetClose>
      </div>
    </div>

    {/* Scrollable content — ONLY this region scrolls */}
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
      {/* content */}
    </div>

    {/* Sticky footer */}
    <div className="flex shrink-0 items-center justify-between gap-4 border-t bg-background px-6 py-4">
      <p className="text-sm text-muted-foreground">Progress info</p>
      <Button disabled={!canSubmit}>Submit</Button>
    </div>
  </SheetContent>
</Sheet>
```

Key rules:
- `showCloseButton={false}` — always use your own close button so layout is under full control
- `flex flex-col p-0 gap-0` on `SheetContent` — removes shadcn defaults that interfere
- Header and footer are `shrink-0` — they never shrink even when content is tall
- `bg-background` on header and footer — prevents content bleeding through when scrolling
- `SheetTitle` and `SheetDescription` must always be present for accessibility (can be `sr-only` if not visible)

---

## 9. Table & Pagination Patterns

### 9.1 DataTable

**File**: `src/components/shared/data-table/data-table.tsx`

```tsx
const columns: ColumnDef<UOM>[] = [
  {
    id: "uomCode",
    header: "Code",
    accessorKey: "uomCode",
    width: "w-[120px]",
  },
  {
    id: "uomName",
    header: "Name",
    accessorKey: "uomName",
  },
  {
    id: "category",
    header: "Category",
    cell: (row) => <span className="capitalize">{row.uomCategory}</span>,
  },
  {
    id: "status",
    header: "Status",
    cell: (row) => <StatusBadge status={row.isActive ? "ACTIVE" : "INACTIVE"} type="generic" size="sm" />,
    width: "w-[100px]",
  },
]

const actions: RowAction<UOM>[] = [
  {
    id: "edit",
    label: "Edit",
    icon: <Pencil className="h-4 w-4" />,
    onClick: (row) => setEditTarget(row),
  },
  {
    id: "delete",
    label: "Delete",
    icon: <Trash2 className="h-4 w-4" />,
    onClick: (row) => setDeleteTarget(row),
    variant: "destructive",
  },
]

<DataTable
  data={data?.items ?? []}
  columns={columns}
  actions={actions}
  isLoading={isLoading}
  emptyMessage="No UOMs found"
  emptyDescription="Add your first unit of measure to get started."
  keyField="uomId"
  stickyActions
/>
```

### 9.2 Pagination

**File**: `src/components/shared/data-table/data-table-pagination.tsx`

```tsx
<DataTablePagination
  currentPage={filters.page ?? 1}
  pageSize={filters.pageSize ?? 10}
  totalItems={Number(data?.totalItems ?? 0)}   // Note: totalItems is string from proto — cast to Number
  totalPages={data?.totalPages ?? 0}
  onPageChange={(page) => setFilters({ ...filters, page })}
  onPageSizeChange={(pageSize) => setFilters({ ...filters, pageSize, page: 1 })}
/>
```

> `totalItems` from the backend is a **string** (proto int64). Always cast: `Number(response.pagination?.totalItems ?? 0)`.

### 9.3 Filter Bar Pattern

Place filters inside `CardContent` above the table, wrapped in a flex row:

```tsx
<div className="flex flex-wrap gap-3">
  <DebouncedSearchInput
    value={filters.search || ""}
    onValueChange={(search) => setFilters({ ...filters, search, page: 1 })}
    placeholder="Search by code or name…"
    className="max-w-xs"
  />
  <Select value={filters.activeFilter} onValueChange={(v) => setFilters({ ...filters, activeFilter: v, page: 1 })}>
    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
    <SelectContent>
      {ACTIVE_FILTER_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
    </SelectContent>
  </Select>
  {hasActiveFilters && (
    <Button variant="ghost" size="sm" onClick={clearFilters}>
      <X className="mr-1.5 h-3.5 w-3.5" /> Clear
    </Button>
  )}
</div>
```

---

## 10. Hook Patterns

### 10.1 CRUD Hook Factory

**File**: `src/lib/hooks/create-crud-hooks.ts`

Generate all CRUD hooks from a single config — use this for every resource:

```ts
// src/hooks/finance/use-uom.ts
const {
  useList: useUOMs,
  useGet: useUOM,
  useCreate: useCreateUOM,
  useUpdate: useUpdateUOM,
  useDelete: useDeleteUOM,
  queryKeys: uomKeys,
} = createCrudHooks({
  serviceScope: "finance",
  resourceName: "UOM",
  apiBasePath: "/api/v1/finance/uoms",
  // parsers, messages, staleTime…
})

export { useUOMs, useUOM, useCreateUOM, useUpdateUOM, useDeleteUOM, uomKeys }
```

### 10.2 Query Key Convention

```ts
// Hierarchical — invalidating a parent invalidates all children
["finance", "uom"]                        // all UOM data
["finance", "uom", "list"]                // all list queries
["finance", "uom", "list", { page, ... }] // specific list
["finance", "uom", "detail", id]          // specific item
```

Invalidate all UOM data after any mutation:
```ts
queryClient.invalidateQueries({ queryKey: ["finance", "uom"] })
```

### 10.3 URL State Hook

**File**: `src/lib/hooks/use-url-state.ts`

```ts
const [filters, setFilters] = useUrlState<ListUOMsParams>({
  defaultValues: { page: 1, pageSize: 10, search: "", activeFilter: 0 }
})
```

- Syncs to browser URL as query params
- Uses `router.replace()` (no history per keystroke)
- Browser back/forward auto-restores filter state
- Always reset `page: 1` when any non-pagination filter changes
- **Only keys present in `defaultValues` are tracked** — pages with server-side sorting MUST include `sortBy`/`sortOrder` in `defaultValues` or sort changes are silently dropped (see RULES.md Mistake 12)

### 10.4 Cache Settings

| Setting | Value | Notes |
|---------|-------|-------|
| `staleTime` | 30–60s | Data considered fresh |
| `gcTime` | 5 min | Cache retained after unmount |
| `refetchOnWindowFocus` | false | Disabled globally |
| Mutation success | Auto-invalidate parent key | Via `onSuccess` in hook |

---

## 11. Types & Normalizer Pattern

**Reference**: `src/types/finance/uom.ts`

Each resource type file has 4 sections:

```ts
// 1. Re-export proto-generated types (type-only, no runtime cost)
export type { UOM, CreateUOMRequest, ListUOMsResponse } from "@/types/generated/finance/v1/uom"

// 2. Export parser classes (for fromJSON deserialization)
export { UOM as UOMParser, ListUOMsResponse as ListUOMsResponseParser } from "@/types/generated/finance/v1/uom"

// 3. UI param types (for hooks/filters — not the proto request type)
export interface ListUOMsParams {
  page?: number
  pageSize?: number
  search?: string
  activeFilter?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

// 4. Form data type (separate from domain entity)
export interface UOMFormData {
  uomCode: string
  uomName: string
  uomCategoryId: string
  isActive: boolean
}

export const DEFAULT_UOM_FORM_VALUES: UOMFormData = {
  uomCode: "", uomName: "", uomCategoryId: "", isActive: true
}

// 5. UI option lists for selects/filters
export const ACTIVE_FILTER_OPTIONS = [
  { value: 0, label: "All Status" },
  { value: 1, label: "Active" },
  { value: 2, label: "Inactive" },
]
```

**Never** edit files in `src/types/generated/` — they are auto-generated from proto.

### Response normalization (camelCase + snake_case)

Backend responses aren't guaranteed to arrive in one casing consistently, so normalizer functions read both:

```ts
function normalizeUOM(raw: RawUOM): NormalizedUOM {
  return {
    uomId: raw.uomId || raw.uom_id || "",
    uomCode: raw.uomCode || raw.uom_code || "",
    // ...
  }
}
```

---

## 12. BFF API Route Pattern

**Reference**: `src/app/api/v1/finance/uoms/route.ts`

### Collection route (`route.ts` — GET list + POST create)

```ts
// src/app/api/v1/finance/uoms/route.ts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const metadata = createMetadataFromRequest(request)
    const client = getUomClient()

    const response = await client.listUOMs({
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize") || searchParams.get("page_size")) || 10,
      search: searchParams.get("search") || "",
    }, metadata)

    return NextResponse.json({
      base: response.base,
      data: response.data,
      pagination: response.pagination,
    })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json({ base: { isSuccess: false, message: "Internal error" } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const metadata = createMetadataFromRequest(request)
    const response = await getUomClient().createUOM(body, metadata)
    return NextResponse.json({ base: response.base, data: response.data })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json({ base: { isSuccess: false, message: "Internal error" } }, { status: 500 })
  }
}
```

### Item route (`[id]/route.ts` — GET + PUT + DELETE)

```ts
// src/app/api/v1/finance/uoms/[uomId]/route.ts
type RouteContext = { params: Promise<{ uomId: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { uomId } = await context.params   // ← always await params
    const metadata = createMetadataFromRequest(request)
    const response = await getUomClient().getUOM({ uomId }, metadata)
    return NextResponse.json({ base: response.base, data: response.data })
  } catch (error) {
    if (isGrpcError(error)) return handleGrpcError(error)
    return NextResponse.json({ base: { isSuccess: false, message: "Internal error" } }, { status: 500 })
  }
}
// PUT and DELETE follow the same pattern
```

### Consistent response shape

All BFF routes return exactly:
```json
{
  "base": { "isSuccess": true, "statusCode": "200", "message": "...", "validationErrors": [] },
  "data": { ... },
  "pagination": { "currentPage": 1, "pageSize": 10, "totalItems": "123", "totalPages": 13 }
}
```

`pagination` is omitted for single-item responses.

### gRPC client registry

**File**: `src/lib/grpc/clients.ts`

```ts
getUomClient()             // Finance UOM
getUserClient()            // IAM User
getRoleClient()            // IAM Role
getPermissionClient()      // IAM Permission
getMenuClient()            // IAM Menu
getAuthClient()            // IAM Auth
getCompanyClient()         // IAM Organization
// ...see clients.ts for full list
```

All clients are singletons via `globalThis` (survive HMR in dev).

### gRPC → HTTP error mapping

**File**: `src/lib/grpc/errors.ts`

```ts
const GRPC_TO_HTTP = {
  [grpc.status.NOT_FOUND]: 404,
  [grpc.status.ALREADY_EXISTS]: 409,
  [grpc.status.INVALID_ARGUMENT]: 400,
  [grpc.status.PERMISSION_DENIED]: 403,
  [grpc.status.UNAUTHENTICATED]: 401,
  // ...
}
```

`isGrpcError()` + `handleGrpcError()` use this table to translate a caught gRPC error into the right `NextResponse` status before returning the standard `{ base, data }` envelope.

---

## 13. Loading & Skeleton Pattern

### Route-level loading (`loading.tsx`) — always required

Every page directory must have a `loading.tsx`:

```tsx
// src/app/(dashboard)/finance/uom/loading.tsx
import { TableSkeleton } from "@/components/loading"

export default function UomLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-4 w-48 bg-muted animate-pulse rounded" />
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
      </div>
      <TableSkeleton rows={8} />
    </div>
  )
}
```

### Available skeleton components

**File**: `src/components/loading/skeleton-loaders.tsx`

| Component | Use case |
|-----------|---------|
| `<TableSkeleton rows={n} />` | List pages |
| `<CardSkeleton />` | KPI cards |
| `<ChartSkeleton />` | Charts |
| `<PageSkeleton />` | Full page |
| `<DashboardSkeleton />` | Dashboard layout |

### Inline loading states

For card sections that load independently, use a simple spinner:
```tsx
{isLoading && (
  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
    <Loader2 className="h-4 w-4 animate-spin" /> Loading…
  </div>
)}
```

For skeleton rows inside a card:
```tsx
{isLoading && Array.from({ length: 3 }).map((_, i) => (
  <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
))}
```

---

## 14. Status & Enum Display

### Status values — always use StatusBadge

```tsx
// ✓ Correct
<StatusBadge status={request.status} type="request" />

// ✗ Wrong — raw Badge leaks styling inconsistency
<Badge>{request.status}</Badge>
```

### Enum values in text — always use humanizeEnumValue

Add this helper wherever enum strings are displayed as text (not badges):

```ts
function humanizeEnumValue(value: string): string {
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}
```

Examples:
- `"UNDER_REVIEW"` → `"Under Review"`
- `"HIGH"` → `"High"`
- `"PARAMETER_PENDING"` → `"Parameter Pending"`

> **Never** use CSS `text-transform: capitalize` alone — it only uppercases the first letter and doesn't lowercase the rest, so `"HIGH"` stays `"HIGH"`.

### Active / inactive filter options

```ts
// Always include "All" as first option with value 0 (UNSPECIFIED)
const STATUS_OPTIONS = [
  { value: 0, label: "All Status" },
  { value: 1, label: "Active" },
  { value: 2, label: "Inactive" },
]
```

---

## 15. User Display

| Use case | Component / function |
|----------|---------------------|
| Display full name | `<UserName userId={id} />` |
| Display full name (compact, no @username) | `<UserName userId={id} compact />` |
| Avatar circle with photo or initials | `<UserAvatar userId={id} colorHash />` |
| Department / org unit name | `<DeptName deptCode={code} />` |

- `UserName` and `UserAvatar` both call `useUser(userId)` internally — TanStack Query caches the result, so the same user appearing 10× in a list triggers only one network request
- `UserAvatar` derives initials from full name word boundaries: "Ilham Ramadhan" → "IR", single word → "I"; renders the real photo instead when `profilePictureUrl` is set
- Colors are deterministic per userId (hash mod 6 palette) — same user always gets same color

---

## 16. Critical Rules & Don'ts

### Layout & Components

| Rule | Why |
|------|-----|
| **Never modify `src/components/ui/`** | shadcn/ui managed — update via CLI only |
| **Wrap shadcn primitives in `components/common/`** when customizing | Keeps ui/ clean |
| **Every page directory needs `loading.tsx`** | Next.js App Router shows it during navigation |
| **Every data-fetching page needs an empty state** | `<EmptyState>` not a bare "No data" string |
| **Card titles always `text-sm font-semibold`** | Consistency across all cards |
| **Don't use `text-transform: capitalize` on ALL_CAPS enums** | Use `humanizeEnumValue()` instead |
| **Sticky drawer header + footer — use `shrink-0`** | Without it, flex children compress |
| **Drawer content area must be `flex-1 overflow-y-auto`** | Only content scrolls, not header/footer |

### TypeScript & Imports

| Rule | Why |
|------|-----|
| **`@/` imports only** — never `../../..` | Readability, refactoring safety |
| **`"use client"` only when using hooks/events** | Maximizes server rendering |
| **`interface` not `type` for props** | Convention |
| **No `any`** | Strict TypeScript |
| **Always `await context.params`** in API routes | Next.js 16 requires async params |

### Data & UX

| Rule | Why |
|------|-----|
| **Never display raw UUIDs to users** | UX: use `<UserName>`, lookup tables, or human-readable codes |
| **Never use `window.confirm()`** | Use `<ConfirmDialog>` instead |
| **Reset `page: 1` when filters change** | Avoid "no results on page 5" after narrowing search |
| **`totalItems` from proto is a string** | Always cast `Number(totalItems)` before display or math |
| **DebouncedSearchInput for all search inputs** | Prevents keystroke lag on every filter |
| **`useUrlState` for all filter/pagination state** | Enables shareable URLs and browser back/forward |

### Forms

| Rule | Why |
|------|-----|
| **Always `form.reset()` in `useEffect([open, target])`** | Prevents stale values when dialog reopens |
| **Show spinner on submit button while pending** | User feedback on slow networks |
| **Validate with Zod schema matching proto `buf.validate` rules** | Front-end validation mirrors backend |

---

## 17. End-to-End Checklist — New Feature

When building a new CRUD feature from scratch, complete in this order:

1. `src/types/{module}/{resource}.ts` — raw types, UI params, form data, option lists
2. `src/hooks/{module}/use-{resource}.ts` — CRUD hooks via `createCrudHooks`
3. `src/app/api/v1/{module}/{resources}/route.ts` — GET list + POST create
4. `src/app/api/v1/{module}/{resources}/[id]/route.ts` — GET + PUT + DELETE
5. `src/components/{module}/{resource}/{resource}-table.tsx` — columns + actions
6. `src/components/{module}/{resource}/{resource}-filters.tsx` — search + selects
7. `src/components/{module}/{resource}/{resource}-form-dialog.tsx` — create/edit
8. `src/components/{module}/{resource}/{resource}-delete-dialog.tsx` — confirm delete
9. `src/app/(dashboard)/{module}/{resource}/page.tsx` — server component
10. `src/app/(dashboard)/{module}/{resource}/loading.tsx` — skeleton
11. `src/app/(dashboard)/{module}/{resource}/{resource}-page-client.tsx` — client component wiring everything together

---

## 18. Improvement Notes

Known gaps identified during a 2026-07 documentation audit — not blockers, but worth knowing before assuming full coverage:

| Area | Severity | Note |
|------|----------|------|
| Limited test coverage | Medium | Only 2 test files exist (query keys + component filter) |
| No E2E tests | Medium | No Playwright/Cypress — only unit/component tests |
| Generated proto types in git | Low | Could be generated in CI instead of committed |
| No error boundary components | Low | Missing React error boundaries |
| No i18n/internationalization | Low | All strings hardcoded |
