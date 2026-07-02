# GoApps Frontend — AI Generation Rules

> **Purpose**: This document is an actionable checklist and decision guide for AI assistants generating or modifying UI code in this codebase. Read this before generating any component, page, or layout.  
> **Last updated**: 2026-06-15  
>
> **Full specs in**:
> - [`DESIGN.md`](./DESIGN.md) — component catalog, tokens, typography
> - [`LAYOUT.md`](./LAYOUT.md) — responsive rules, overflow, page structure

---

## Pre-Generation Checklist

Before writing any UI code, confirm:

- [ ] I have read `DESIGN.md` for the component(s) I am about to use
- [ ] I have read `LAYOUT.md` for the page layout type I am building
- [ ] The reference page is `/finance/product-requests/[requestId]` — when in doubt, check what that page does
- [ ] I have NOT hardcoded any colors (no `text-gray-*`, `bg-white`, etc.)
- [ ] I have NOT modified anything inside `src/components/ui/`

---

## 1. The Cardinal Rules

These 10 rules are never negotiable:

| # | Rule |
|---|------|
| 1 | **`CardTitle` always gets `className="text-sm font-semibold"`** — always, no exceptions |
| 2 | **Never use `<Badge>` for entity status** — always `<StatusBadge status={...} type={...} />` |
| 3 | **Never modify `src/components/ui/`** — extend via `components/common/` or `components/shared/` |
| 4 | **`min-w-0` on every flex parent in the main layout path** — prevents horizontal page overflow |
| 5 | **Tables must be inside `overflow-x-auto` wrapper** — `DataTable` handles this automatically |
| 6 | **`flex-wrap` on every action bar** — `flex flex-wrap items-center gap-2` |
| 7 | **`loading={isLoading}` on every `KpiCard`** — always pass the loading state |
| 8 | **`Number(totalItems)` always** — proto returns `totalItems` as string |
| 9 | **`form.reset()` in `useEffect([open, target])`** — always reset form on open |
| 10 | **Never `window.confirm()`** — always `<ConfirmDialog>` for destructive actions |

---

## 2. Typography Decision Tree

```
What am I labelling?
│
├─ Page title (PageHeader h1)
│   → text-xl font-bold tracking-tight md:text-2xl
│
├─ Card title (CardTitle component)
│   → ALWAYS: className="text-sm font-semibold"
│
├─ Section header inside a card (divides content areas)
│   → text-xs uppercase tracking-wide text-muted-foreground
│
├─ Field label in a DETAIL view (read-only, non-form)
│   → text-xs text-muted-foreground  (sentence case, no uppercase)
│
├─ Field label in a FORM (FormLabel component)
│   → FormLabel default (text-sm font-medium) — no className override
│
├─ Field value in a detail view
│   → text-sm  (default foreground)
│
├─ Ticket / code / ID (mono)
│   → font-mono text-xs text-muted-foreground
│
├─ KPI number
│   → text-2xl font-bold tabular-nums md:text-3xl
│
├─ Table header cell
│   → (shadcn TableHead default: text-sm text-muted-foreground)
│
├─ Table data cell
│   → text-sm
│
└─ Helper / hint text
    → text-sm text-muted-foreground
```

---

## 3. Component Selection Decision Tree

```
I need to show an entity's status or lifecycle state
→ <StatusBadge status={x} type="request|product|job|..." />
→ Add new statuses to src/lib/ui/status-colors.ts

I need to show a category, tag, or label (NOT a status)
→ <Badge variant="outline"> or <Badge variant="secondary">

I need to confirm a destructive user action
→ <ConfirmDialog confirmVariant="destructive" .../>

I need a form with ≤5 fields
→ <Dialog> with standard <DialogContent>

I need a form with 6+ fields
→ <Dialog> with <ScrollableDialogContent>

I need a search field
→ <DebouncedSearchInput> (NEVER plain Input + onChange)

I need to show there is no data in a list/table
→ <EmptyState> (DataTable renders this automatically via emptyMessage prop)

I need a page-level header with actions
→ <PageHeader title="..." subtitle="..."> {buttons} </PageHeader>

I need summary statistics at the top of a page
→ <KpiGrid cols={n}><KpiCard .../></KpiGrid>

I need a side panel that stays in context
→ <Sheet side="right" ...> (Drawer pattern from DESIGN.md §5.11)

I need to pick from a long/async list in a form
→ Build a Combobox (DESIGN.md §5.6) — NEVER a Select with 50+ items

I need a multi-value filter (e.g. several product types at once)
→ Multi-Select Combobox (DESIGN.md §5.6) — popover stays open on toggle,
   count badge in trigger, "Clear selection" CommandItem INSIDE the popover
   (never a nested interactive element inside the trigger button)

I need sortable column headers on a custom table
→ <SortableHeader> from src/components/shared/data-table/sortable-header.tsx (DESIGN.md §5.24)
→ NEVER ad-hoc sort buttons inside TableHead

I need show/hide columns on a custom table (>6 columns)
→ useColumnVisibility("<module>-<entity>", columns) + <ColumnVisibilityMenu> (DESIGN.md §5.24)
→ Identity/key column gets canHide: false

I need list rows that navigate to a detail page
→ onClick on TableRow + cursor-pointer; stopPropagation on the actions cell;
   identity column stays plain text — no <Link> inside a clickable row (DESIGN.md §5.24)

I need to show multi-line read-only text
→ <p className="text-sm whitespace-pre-wrap"> (NOT a Textarea)

I need pagination
→ <DataTablePagination> — always inside CardContent after DataTable

I need a notification/warning inline on the page
→ Use the Alert/Notice banner pattern (DESIGN.md §5.1) — NOT shadcn <Alert>

I need to show a loading state for server data
→ KpiCard: loading={isLoading} prop
→ DataTable: isLoading prop
→ Custom: <Skeleton> components from components/loading/

I need a filter bar above the table
→ DebouncedSearchInput (search) + Select (dropdowns) + ghost Button (Clear)
   All inside: <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
```

---

## 4. Layout Decision Tree

```
What kind of page am I building?

├─ List of entities (master data, transactions)
│   → See LAYOUT.md §4.1
│   → Root: <div className="space-y-6">
│   → Structure: PageHeader → (KpiGrid) → Card[filters + table + pagination]

├─ Detail of a single entity
│   → See LAYOUT.md §4.2
│   → Root: <div className="space-y-6">
│   → Structure: PageHeader → (notice) → action bar → bento grid (8+4)

├─ Dashboard / overview
│   → See LAYOUT.md §4.3
│   → Root: <div className="space-y-6">
│   → Structure: PageHeader → KpiGrid → secondary grids → recent table

└─ Configuration / form page
    → See LAYOUT.md §4.4
    → Root: <div className="space-y-6">
    → Structure: PageHeader → single Card with internal sections
```

---

## 5. Responsiveness Checklist

For every component/page generated, verify:

- [ ] Action bar uses `flex flex-wrap items-center gap-2`
- [ ] Filter bar uses `flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`
- [ ] Card field grids use `grid grid-cols-2 md:grid-cols-4 gap-4`
- [ ] Any flex parent on the main layout path has `min-w-0`
- [ ] **`KpiGrid` always starts at `grid-cols-2`** minimum (never `grid-cols-1`) — 4-KPI rows use `grid-cols-2 lg:grid-cols-4`
- [ ] Tables use `DataTable` (overflow handled internally), OR are wrapped in `overflow-x-auto`
- [ ] Custom tables needing sticky thead + horizontal scroll use raw `<table>` inside `overflow-x-auto overflow-y-auto max-h-[Npx]` — NOT the shadcn `<Table>` component
- [ ] `hideOnMobile: true` on secondary table columns (description, timestamps)
- [ ] `tableId` on any table with 5+ columns (enables column visibility menu)
- [ ] `stickyActions` on any table with 4+ columns
- [ ] Column visibility state lives in the **page component** when the toggle appears in `CardHeader`
- [ ] Dialog max-width uses `sm:max-w-[Npx]` (full-width on mobile, capped on desktop)
- [ ] Drawer uses `w-full sm:max-w-2xl`
- [ ] No hardcoded px widths on main content containers (they should flex/fill)
- [ ] **Control height parity**: every control in a filter/toolbar row is `h-9` (36px) — search input, comboboxes, selects, column-visibility trigger, adjacent buttons; never mix h-8/h-10 in one row (DESIGN.md §4)
- [ ] **PageHeader action buttons**: all same size (default, 36px); below `sm` they collapse to icon-only — `hidden sm:inline` on the label + `aria-label` on the button (DESIGN.md §5.3)
- [ ] **375px floor**: page verified at 375px — zero horizontal page overflow, filters stack, tables scroll inside their wrapper only (LAYOUT.md §8)
- [ ] KpiGrid with an odd card count needs no manual fix — the last card auto-spans the 2-col mobile row

---

## 6. Do / Don't Quick Reference

### Typography

| ✓ Do | ✗ Don't |
|------|---------|
| `<CardTitle className="text-sm font-semibold">` | `<CardTitle>` without className |
| `text-xs text-muted-foreground` for field labels | `text-muted-foreground` alone (no size) |
| `text-xs uppercase tracking-wide text-muted-foreground` for section headers | `font-bold` or `text-base` for section headers |
| `font-mono text-xs text-muted-foreground` for codes | `font-mono` alone (specify size too) |
| `humanizeEnumValue("UNDER_REVIEW")` → "Under Review" | CSS `capitalize` on ALL_CAPS → stays "UNDER REVIEW" |

### Colors

| ✓ Do | ✗ Don't |
|------|---------|
| `text-muted-foreground` | `text-gray-500` |
| `bg-muted` | `bg-gray-100` |
| `text-destructive` | `text-red-500` |
| `bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400` | `bg-green-100 text-green-700` (no dark variant) |
| `border-destructive/40` | `border-red-200` |

### Components

| ✓ Do | ✗ Don't |
|------|---------|
| `<StatusBadge status={x} type="request" />` | `<Badge>{x}</Badge>` for entity status |
| `<ConfirmDialog .../>` | `window.confirm(...)` |
| `<DebouncedSearchInput .../>` | `<Input onChange={...}/>` for search |
| `<EmptyState title="..." />` | `<p>No data</p>` |
| `<ScrollableDialogContent>` for 6+ fields | Regular `<DialogContent>` that overflows |
| `<DataTablePagination totalItems={Number(...)} />` | `totalItems={response.totalItems}` (string) |
| Extend `status-colors.ts` for new statuses | Inline `<Badge className="bg-green-...">` |
| `<SortableHeader>` for header-click sort | Ad-hoc `<Button>` sort toggles inside `TableHead` |
| Row nav: `onClick` on `TableRow` + `stopPropagation` on actions cell | `<Link>` on the identity column inside a clickable row |
| `KpiCard` neutral (`default`) variant for count widgets | `success`/`warning` variants for plain category counts |
| "Clear selection" `CommandItem` inside the multi-combobox popover | `<span role="button">` (inline ✕) nested in the trigger button |

### Forms

| ✓ Do | ✗ Don't |
|------|---------|
| `useEffect(() => form.reset(...), [open, target])` | No reset → stale dialog values |
| `<span className="text-destructive">*</span>` for required | `(required)` in label text |
| `disabled={isPending}` on all fields | Leaving fields editable during submit |
| `<Loader2 className="mr-2 h-4 w-4 animate-spin" />` on submit button | Just disabling button with no visual feedback |
| Zod schema that mirrors proto `buf.validate` rules | Loose validation that misses backend constraints |

### Layout

| ✓ Do | ✗ Don't |
|------|---------|
| `<div className="space-y-6">` as page root | `<div className="space-y-4">` (too tight) or no spacing |
| `min-w-0` on flex parents | Omitting `min-w-0` → horizontal page overflow |
| `flex-wrap` on action bars | `flex` without wrap → buttons overlap on mobile |
| `grid-cols-2 md:grid-cols-4` for field grids | `grid-cols-4` without responsive prefix |
| `sm:max-w-[480px]` on dialogs | Fixed `max-w-[480px]` without `sm:` → too narrow on all screens |

---

## 7. New Page Scaffold (copy-paste template)

### List Page

```
src/app/(dashboard)/{module}/{resource}/
├── page.tsx
├── loading.tsx
└── {resource}-page-client.tsx
```

**`page.tsx`:**
```tsx
import { generateMetadata as genMeta } from "@/config/site"
import { ResourcePageClient } from "./{resource}-page-client"

export const metadata = genMeta("Resource Name")
export default function ResourcePage() {
  return <ResourcePageClient />
}
```

**`loading.tsx`:**
```tsx
import { TableSkeleton } from "@/components/loading"

export default function ResourceLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-7 w-64 animate-pulse rounded bg-muted" />
      </div>
      <TableSkeleton rows={8} />
    </div>
  )
}
```

**`{resource}-page-client.tsx`:**
```tsx
"use client"
import { useState, Suspense } from "react"
import { Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/common/page-header"
import { DataTable, type ColumnDef, type RowAction } from "@/components/shared"
import { DataTablePagination } from "@/components/shared/data-table/data-table-pagination"
import { DebouncedSearchInput } from "@/components/common"
import { StatusBadge } from "@/components/common/status-badge"
import { useResources } from "@/hooks/{module}/use-{resource}"
import { useUrlState } from "@/lib/hooks"
import type { Resource, ListResourcesParams } from "@/types/{module}/{resource}"

const defaultFilters: ListResourcesParams = {
  page: 1, pageSize: 10, search: "",
}

function ResourcePageContent() {
  const [filters, setFilters] = useUrlState<ListResourcesParams>({ defaultValues: defaultFilters })
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Resource | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null)

  const { data, isLoading, isError } = useResources(filters)

  const columns: ColumnDef<Resource>[] = [
    { id: "code", header: "Code", width: "w-[120px]", cell: (r) => <span className="font-mono text-sm">{r.code}</span> },
    { id: "name", header: "Name", accessorKey: "name" },
    { id: "status", header: "Status", width: "w-[120px]", cell: (r) => <StatusBadge status={r.isActive ? "ACTIVE" : "INACTIVE"} type="product" size="sm" /> },
  ]

  const actions: RowAction<Resource>[] = [
    { id: "edit", label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: setEditTarget },
    { id: "delete", label: "Delete", icon: <Trash2 className="h-4 w-4" />, onClick: setDeleteTarget, variant: "destructive" },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Resources" subtitle="Manage resources">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Resource
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Resource List</CardTitle>
          <CardDescription>
            {isLoading ? "Loading…" : `${Number(data?.pagination?.totalItems ?? 0)} records`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <DebouncedSearchInput
              value={filters.search || ""}
              onValueChange={(search) => setFilters({ ...filters, search, page: 1 })}
              placeholder="Search…"
              containerClassName="flex-1 sm:max-w-sm"
            />
          </div>
          {isError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              Failed to load data.
            </div>
          )}
          <DataTable
            data={data?.data ?? []}
            columns={columns}
            actions={actions}
            keyField="resourceId"
            isLoading={isLoading}
            tableId="resource-table"
            stickyActions
            emptyMessage="No resources found"
            emptyDescription="Try adjusting your search."
          />
          <DataTablePagination
            currentPage={filters.page ?? 1}
            pageSize={filters.pageSize ?? 10}
            totalItems={Number(data?.pagination?.totalItems ?? 0)}
            totalPages={data?.pagination?.totalPages ?? 0}
            onPageChange={(page) => setFilters({ ...filters, page })}
            onPageSizeChange={(pageSize) => setFilters({ ...filters, pageSize, page: 1 })}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
    </div>
  )
}

export function ResourcePageClient() {
  return (
    <Suspense fallback={<div className="space-y-6"><div className="h-7 w-64 animate-pulse rounded bg-muted" /></div>}>
      <ResourcePageContent />
    </Suspense>
  )
}
```

---

## 8. Common Mistakes to Avoid

### Mistake 1: Status with raw Badge

```tsx
// ✗ Wrong
<Badge variant={row.isActive ? "default" : "secondary"}>
  {row.isActive ? "Active" : "Inactive"}
</Badge>

// ✓ Correct
<StatusBadge status={row.isActive ? "ACTIVE" : "INACTIVE"} type="product" size="sm" />
```

---

### Mistake 2: CardTitle without className

```tsx
// ✗ Wrong — uses shadcn default which may not match design
<CardTitle>Product List</CardTitle>

// ✓ Correct — always explicit
<CardTitle className="text-sm font-semibold">Product List</CardTitle>
```

---

### Mistake 3: Form without reset on open

```tsx
// ✗ Wrong — dialog shows stale data from previous open
const form = useForm({ defaultValues: { name: "" } })

// ✓ Correct — reset every time dialog opens or target changes
useEffect(() => {
  if (open) {
    form.reset(entity
      ? { name: entity.name }
      : { name: "" }
    )
  }
}, [open, entity, form])
```

---

### Mistake 4: Proto totalItems as string in math

```tsx
// ✗ Wrong — string arithmetic ("10" + "5" = "105")
const total = data?.pagination?.totalItems ?? 0

// ✓ Correct
const total = Number(data?.pagination?.totalItems ?? 0)
```

---

### Mistake 5: Filter search without debounce

```tsx
// ✗ Wrong — triggers API call on every keystroke
<Input value={filters.search} onChange={(e) => setFilters({ search: e.target.value })} />

// ✓ Correct
<DebouncedSearchInput
  value={filters.search || ""}
  onValueChange={(search) => setFilters({ ...filters, search, page: 1 })}
  debounceMs={300}
/>
```

---

### Mistake 6: Forgetting flex-wrap on action bars

```tsx
// ✗ Wrong — buttons can overlap on narrow screens
<div className="flex items-center gap-2">
  <Button>Submit</Button>
  <Button variant="outline">Edit</Button>
</div>

// ✓ Correct
<div className="flex flex-wrap items-center gap-2">
  <Button>Submit</Button>
  <Button variant="outline">Edit</Button>
</div>
```

---

### Mistake 7: Enum display without humanize

```tsx
// ✗ Wrong — shows "UNDER_REVIEW" or "under review" depending on CSS
<span className="capitalize">{record.status}</span>

// ✓ Correct — "Under Review"
<span>{humanizeEnumValue(record.status)}</span>

function humanizeEnumValue(value: string): string {
  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}
```

---

### Mistake 8: Shadcn `<Table>` component when sticky header + horizontal scroll are both needed

```tsx
// ✗ Wrong — Table wraps in overflow-x-auto which breaks sticky thead
<div className="overflow-x-auto overflow-y-auto max-h-[540px]">
  <Table>   {/* ← adds its own overflow-x-auto wrapper → sticky fails */}
    <TableHeader className="sticky top-0">...</TableHeader>
  </Table>
</div>

// ✓ Correct — raw <table> inside a single bounded scroll container
<div className="rounded-md border overflow-hidden">
  <div className="overflow-x-auto overflow-y-auto max-h-[540px]">
    <table className="w-full caption-bottom text-sm">
      <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
        ...
      </TableHeader>
      <TableBody>...</TableBody>
    </table>
  </div>
</div>
```

The shadcn `<Table>` adds `<div className="relative w-full overflow-x-auto">` around `<table>`, which becomes the innermost scroll container and intercepts sticky. Use `<table>` directly when you need both axes. See LAYOUT.md §9 for the full pattern.

---

### Mistake 9: Column visibility state inside the table component

When the column toggle button (`<ColumnVisibilityMenu>`) needs to live in the `CardHeader` (next to the title), the visibility state must be in the **page component** — not inside the table component.

```tsx
// ✗ Wrong — visibility state buried inside RequestTable, toggle can't be placed in CardHeader
<Card>
  <CardHeader>
    <CardTitle>Request List</CardTitle>
    {/* ← nowhere to put the toggle */}
  </CardHeader>
  <CardContent>
    <RequestTable ... />   {/* toggle is stuck inside here */}
  </CardContent>
</Card>

// ✓ Correct — hoist visibility state to page level
const { columns, visibility, toggle, setAll, reset } = useRequestTableColumns()

<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0">
    <div>
      <CardTitle>Request List</CardTitle>
      <CardDescription>…</CardDescription>
    </div>
    <ColumnVisibilityMenu columns={columns} visibility={visibility}
      onToggle={toggle} onSetAll={setAll} onReset={reset} />
  </CardHeader>
  <CardContent>
    <RequestTable visibility={visibility} ... />
  </CardContent>
</Card>
```

Pattern: export `useMyTableColumns()` hook from the table file; call it in the page; pass `visibility` as a prop to the table.

---

### Mistake 10: Missing page loading.tsx

Every page directory **must** have a `loading.tsx`. If you create a new page, create the loading file too.

---

### Mistake 11: UUID displayed to users

```tsx
// ✗ Wrong
<td>{row.requesterUserId}</td>

// ✓ Correct
<td><UserName userId={row.requesterUserId} /></td>
```

---

### Mistake 12: Sort state not in useUrlState defaultValues

`useUrlState` only tracks keys that are present in `defaultValues`. If a page adds server-side sorting but `sortBy`/`sortOrder` are missing from `defaultFilters`, header clicks are **silently dropped** — the URL never updates and the list never re-sorts.

```tsx
// ✗ Wrong — sortBy/sortOrder missing → sort clicks silently ignored
const defaultFilters: ListParams = { page: 1, pageSize: 20, search: "" }

// ✓ Correct — sortBy/sortOrder must be listed even when empty
const defaultFilters: ListParams = {
  page: 1, pageSize: 20, search: "",
  sortBy: "",
  sortOrder: undefined,
}
```

Also: sort keys must match the proto `sort_by` validated values, and every sort change resets `page: 1`. See DESIGN.md §5.24 (Sortable Columns).

---

### Mistake 13: Typography.ts cardTitle — stale value

The file `src/lib/ui/typography.ts` has a conflicting `cardTitle` definition. The **correct value** is:
```ts
cardTitle: "text-sm font-semibold",   // NOT "text-sm font-medium text-muted-foreground"
```
Until the file is updated, **do not use `typography.cardTitle`** for CardTitle. Use the class directly: `className="text-sm font-semibold"`.

---

## 9. When Extending the Design System

### Adding a new status type

1. Open `src/lib/ui/status-colors.ts`
2. Add to existing `StatusType` union or add a new type
3. Add the status entries to `statusRegistry`
4. Never add inline Badge class overrides anywhere else

### Adding a new shared component

1. Build in `src/components/common/` (generic) or `src/components/shared/` (feature-generic)
2. Export from the directory's `index.ts`
3. Document it in `DESIGN.md` §5 with usage, props, and rules

### Adding a new page pattern

1. Document the layout in `LAYOUT.md` §4 with a code example
2. Update `RULES.md` §3 decision tree if it's a fundamentally different page type

### Updating design tokens

1. Edit `src/app/globals.css` only
2. Update the token table in `DESIGN.md` §1
3. Run `npm run build` to verify no broken Tailwind class references
