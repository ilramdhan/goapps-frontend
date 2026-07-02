# GoApps Frontend — Design System

> **Authority**: This document is the single source of truth for all visual decisions.  
> **Reference page**: `/finance/product-requests/[requestId]` — the canonical UI benchmark.  
> **Last updated**: 2026-06-15  
>
> **Related docs**:
> - [`LAYOUT.md`](./LAYOUT.md) — responsive breakpoints, page structure, overflow rules
> - [`RULES.md`](./RULES.md) — AI generation checklist, do/don't, decision trees
> - [`../../CLAUDE.md`](../../CLAUDE.md) — architecture, BFF patterns, hooks

---

## Table of Contents

1. [Design Tokens](#1-design-tokens)
2. [Typography Scale](#2-typography-scale)
3. [Color Usage](#3-color-usage)
4. [Spacing & Density](#4-spacing--density)
5. [Components A–Z](#5-components-az)
   - [Alert / Notice Banner](#51-alert--notice-banner)
   - [Badge (raw)](#52-badge-raw)
   - [Button](#53-button)
   - [Card](#54-card)
   - [Checkbox](#55-checkbox)
   - [Combobox](#56-combobox)
   - [Date Picker](#57-date-picker)
   - [Dialog — Short Form](#58-dialog--short-form)
   - [Dialog — Tall Form (ScrollableDialog)](#59-dialog--tall-form-scrollabledialog)
   - [Dialog — Confirm / Destructive](#510-dialog--confirm--destructive)
   - [Drawer / Sheet](#511-drawer--sheet)
   - [DropdownMenu](#512-dropdownmenu)
   - [EmptyState](#513-emptystate)
   - [Form Fields (all)](#514-form-fields-all)
   - [Input](#515-input)
   - [KpiCard / KpiGrid](#516-kpicard--kpigrid)
   - [PageHeader](#517-pageheader)
   - [Pagination](#518-pagination)
   - [Radio / RadioGroup](#519-radio--radiogroup)
   - [Select](#520-select)
   - [Slider](#521-slider)
   - [StatusBadge](#522-statusbadge)
   - [Switch](#523-switch)
   - [Table (DataTable)](#524-table-datatable)
   - [Tabs](#525-tabs)
   - [Textarea](#526-textarea)
   - [Timeline](#527-timeline)
   - [Toast / Sonner](#528-toast--sonner)
   - [Toggle / ToggleGroup](#529-toggle--togglegroup)
   - [Tooltip](#530-tooltip)
6. [Iconography](#6-iconography)
7. [Dark Mode](#7-dark-mode)

---

## 1. Design Tokens

All tokens are CSS custom properties defined in `src/app/globals.css`. TailwindCSS 4 reads them via `@theme inline`. **Never hardcode hex values** — always use semantic token names.

### Color Tokens

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--background` | white | near-black | Page/content background |
| `--foreground` | dark | near-white | Default text |
| `--card` | white | dark-card | Card background |
| `--card-foreground` | dark | near-white | Text inside cards |
| `--primary` | indigo-blue | indigo-blue (lighter) | Primary buttons, active states, links |
| `--primary-foreground` | near-white | near-white | Text on primary buttons |
| `--secondary` | light gray | dark gray | Secondary buttons, subtle elements |
| `--secondary-foreground` | dark | near-white | Text on secondary |
| `--muted` | lightest gray | very dark | Muted backgrounds (table header, skeleton) |
| `--muted-foreground` | medium gray | medium gray | Secondary labels, placeholders, field hints |
| `--accent` | lightest gray | very dark | Hover states, non-bold highlights |
| `--destructive` | red | red (lighter) | Delete buttons, error states |
| `--border` | light gray | white/10% | Borders, dividers |
| `--input` | light gray | white/15% | Input borders |
| `--ring` | medium gray | medium gray | Focus rings |

### Semantic Color Palette (Status-safe colors)

These are fixed semantic colors used in StatusBadge and KpiCard variants. Use via Tailwind utility classes:

| Semantic | Classes (light + dark) | When to use |
|----------|------------------------|-------------|
| Success | `bg-emerald-100 text-emerald-700` / `dark:bg-emerald-500/15 dark:text-emerald-400` | Active, approved, complete, success |
| Warning | `bg-amber-100 text-amber-700` / `dark:bg-amber-500/15 dark:text-amber-400` | Pending, review, in-progress |
| Destructive | `bg-destructive/10 text-destructive` | Rejected, failed, error |
| Neutral | `bg-secondary text-secondary-foreground` | Draft, inactive, cancelled |

### Radius Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--radius` (base) | `0.625rem` | Cards, dialogs, large containers |
| `rounded-sm` | `calc(radius - 4px)` | Badges, small chips |
| `rounded-md` | `calc(radius - 2px)` | Buttons, inputs, selects |
| `rounded-lg` | `var(--radius)` | Cards, modals |
| `rounded-xl` | `calc(radius + 4px)` | Large feature cards |

### Shadow

| Class | Usage |
|-------|-------|
| (none) | Default cards |
| `shadow-sm` | Dropdown, tooltip, popover |
| `shadow-md` | Hover on clickable cards, dialogs |
| `shadow-lg` | Sheets/Drawers backdrop |

### Z-Index Layers

| Layer | Value | Elements |
|-------|-------|---------|
| `z-10` | 10 | Sticky table header |
| `z-20` | 20 | Sticky table cells |
| `z-30` | 30 | Sticky table header cells |
| `z-40` | 40 | Dropdown menus, popovers |
| `z-50` | 50 | Sticky page header (`sticky top-0 z-50`) |
| `z-[100]` | 100 | Dialogs, sheets |
| `z-[200]` | 200 | Toasts, notifications |

---

## 2. Typography Scale

> **Critical**: `typography.ts` in `src/lib/ui/typography.ts` must match these values. The reference page (`request-detail-panel.tsx`) is the ground truth.

### Canonical Typography Map

```ts
// src/lib/ui/typography.ts — CANONICAL version (fixes prior conflicts)
export const typography = {
  // Page-level headings
  pageTitle:    "text-xl font-bold tracking-tight md:text-2xl",   // PageHeader h1
  pageSubtitle: "text-sm text-muted-foreground",                  // PageHeader subtitle

  // Card headings — ALWAYS text-sm font-semibold, NEVER muted
  cardTitle:    "text-sm font-semibold",

  // Field labels — two flavours
  fieldLabel:   "text-xs text-muted-foreground",                  // Simple label in forms
  sectionLabel: "text-xs uppercase tracking-wide text-muted-foreground", // Section header inside detail cards

  // Metric / KPI display
  metric:       "text-2xl font-bold tabular-nums md:text-3xl",
  metricDelta:  "text-xs text-muted-foreground",

  // Table
  tableCell:    "text-sm",
  tableHeader:  "text-xs font-medium text-muted-foreground",      // shadcn TableHead default

  // Special
  mono:         "font-mono text-xs",                              // Codes, IDs, ticket numbers
  monoSm:       "font-mono text-xs text-muted-foreground",        // Subtle mono (request no. prefix)
} as const
```

### Usage Rules

| Context | Class | Example |
|---------|-------|---------|
| Page title (h1) | `text-xl font-bold tracking-tight md:text-2xl` | "Product Requests" |
| Page subtitle | `text-sm text-muted-foreground` | "Manage costing requests" |
| **Card title** | `text-sm font-semibold` | "Product specification" |
| Card description / subtitle | `text-xs text-muted-foreground` | "Max 25 MB per file." |
| Field label (form) | `text-sm font-medium` (FormLabel default) | "Code" |
| Field label (detail view) | `text-xs text-muted-foreground` | "Type", "Urgency" |
| Section label (inside card) | `text-xs uppercase tracking-wide text-muted-foreground` | "Classification", "Feasibility" |
| Field value (body) | `text-sm` | "High", "2024-01-15" |
| Ticket/code (mono) | `font-mono text-xs text-muted-foreground` | "CPR-000106" |
| Badge/chip text | `text-xs` | "Active", "Draft" |
| Table header cell | `text-xs font-medium text-muted-foreground` | "Name", "Status" |
| Table data cell | `text-sm` | row values |
| KPI number | `text-2xl font-bold tabular-nums md:text-3xl` | "1,234" |
| KPI label | `text-sm font-medium text-muted-foreground` | "Total Requests" |
| Error message | `text-sm text-destructive` | "Code is required" |
| Hint / description | `text-sm text-muted-foreground` | "Must be uppercase" |

### Do Not Use

- `text-base` for card titles — too large, use `text-sm font-semibold`
- `uppercase` + `tracking-wide` for card titles — reserved for section labels inside cards
- `font-bold` for card titles — too heavy, use `font-semibold`
- `text-lg` or larger anywhere inside a card body
- Hardcoded colors like `text-gray-500` — use `text-muted-foreground`

---

## 3. Color Usage

### When to Use Each Variant

**`text-foreground`** — Primary body text, field values, titles. Default for readable content.

**`text-muted-foreground`** — Secondary information: field labels, timestamps, placeholder hints, descriptions, count badges ("3/5 approved"), table header labels.

**`text-destructive`** — Error messages, delete labels, reject reason highlights. Never for general warning.

**`bg-muted`** — Table header background, skeleton loaders, disabled input backgrounds, `EmptyState` icon circle background.

**`bg-muted/40`** — Read-only notice banners, terminal-state notice bars (lighter than muted for notices that shouldn't compete with content).

**`border-destructive/40`** — Card border for cards containing destructive content (reject reason, error detail). Use `/40` opacity to soften.

**`bg-destructive/10 text-destructive`** — Inline destructive badges/chips (not StatusBadge — only for ad-hoc destructive callouts).

### Consistent Semantic Color Mapping

| State | Tailwind Approach |
|-------|-------------------|
| Active / success | `emerald-*` palette |
| Warning / pending | `amber-*` palette |
| Error / rejected | `destructive` token |
| Neutral / draft | `secondary` token |
| Override / changed | `text-orange-600` (only for field-level "was X → now Y" annotations) |

---

## 4. Spacing & Density

### Vertical Rhythm — Page Level

```tsx
// Every page client component root:
<div className="space-y-6">
  <PageHeader ... />
  <Card>...</Card>
  <Card>...</Card>  {/* each card separated by gap-6 */}
</div>

// Detail pages — bento grid:
<div className="space-y-6">
  <div className="flex flex-wrap items-center gap-2">...</div> {/* action bar */}
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
    <div className="lg:col-span-8 space-y-6">...</div>
    <div className="lg:col-span-4 space-y-6">...</div>
  </div>
</div>
```

### Card Padding (shadcn defaults — do not override)

| Slot | Default | Override rule |
|------|---------|---------------|
| `CardHeader` | `p-6` | Never override unless justified |
| `CardContent` | `p-6 pt-0` | Add `className="space-y-4"` for field groups |
| `CardFooter` | `p-6 pt-0` | — |

When `CardHeader` has a right slot (badge, button), always add `space-y-0` to prevent double-spacing:
```tsx
<CardHeader className="flex flex-row items-center justify-between space-y-0">
```

### Internal Card Spacing

| Pattern | Gap |
|---------|-----|
| Field grid inside card | `grid ... gap-4` |
| Between field value and label | `space-y-0.5` (detail) or `space-y-1` (form) |
| Between sections inside a card | `border-t pt-4` |
| Between cards in same column | `space-y-6` |
| Action bar button gap | `gap-2` |
| Filter bar item gap | `gap-3` |
| Icon + text inside button | `mr-2 h-4 w-4` on icon |
| Icon + text inside badge | `mr-1 h-3 w-3` on icon |

### Control Height Parity (filter / toolbar rows)

Every control in a filter/toolbar row is **`h-9` (36px)** — search inputs, comboboxes, selects, the column-visibility trigger, and any adjacent buttons. Never mix `h-8`/`h-10` controls in the same row.

```tsx
<DebouncedSearchInput className="h-9" ... />
<ProductTypeMultiCombobox className="h-9" ... />
<SelectTrigger className="h-9">...</SelectTrigger>
<ColumnVisibilityMenu className="h-9" ... />  {/* trigger defaults to h-8 — pass h-9 in filter rows */}
```

Reference implementation: the filter toolbar in `src/app/(dashboard)/finance/product-master/product-master-page-client.tsx`.

---

## 5. Components A–Z

---

### 5.1 Alert / Notice Banner

Used for contextual notices that appear inline on a page — not toasts. Two variants:

#### Read-Only / Terminal Notice (dashed border)

```tsx
{isTerminal && (
  <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
    <Ban className="h-4 w-4 shrink-0" />
    <span>
      This request is <strong>rejected</strong> and read-only.
    </span>
  </div>
)}
```

#### Info Notice

```tsx
<div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
  <Info className="h-4 w-4 shrink-0 text-primary" />
  <span>Some helpful context here.</span>
</div>
```

#### Warning Notice

```tsx
<div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
  <AlertTriangle className="h-4 w-4 shrink-0" />
  <span>Warning content.</span>
</div>
```

#### Error Notice

```tsx
<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
  Failed to load data. {error instanceof Error ? error.message : "Please retry."}
</div>
```

**Rules:**
- Always `shrink-0` on the icon — prevents squishing when text is long
- `border-dashed` only for read-only/terminal notices
- Never use `<Alert>` from shadcn for inline notices — it's too tall. Use the patterns above.
- Place notice banners directly below `PageHeader`, before the main card grid

---

### 5.2 Badge (raw)

> Use `<Badge>` directly **only for non-status, non-entity labels** (category chips, tags). For entity status, always use `<StatusBadge>`.

```tsx
// Category chip (outline)
<Badge variant="outline">{category.name}</Badge>

// Neutral tag
<Badge variant="secondary">Excel</Badge>

// Count chip
<Badge variant="outline" className="font-mono">{count}</Badge>

// Monospace code chip
<Badge variant="secondary" className="font-mono text-xs font-normal">CPR-000106</Badge>
```

**Variants:**
| Variant | When to use |
|---------|-------------|
| `default` | Active/primary label (use sparingly — prefer StatusBadge for states) |
| `secondary` | Neutral labels, tags, codes |
| `outline` | Category chips, read-only labels, counts |
| `destructive` | Only for explicit destructive labels outside status registry |

**Do not:**
- Use `<Badge>` for entity status (Active/Inactive, DRAFT/SUBMITTED) — use `<StatusBadge>`
- Create inline `className` to override badge colors for statuses — extend `status-colors.ts` instead
- Use `variant="default"` for category labels — that's `primary` background, too heavy

---

### 5.3 Button

#### Variants

| Variant | Class | When to use |
|---------|-------|-------------|
| `default` | Filled primary | Main CTA: Submit, Create, Approve, Release |
| `secondary` | Filled gray | Secondary positive action: "Verify classification", "Use existing" |
| `outline` | Bordered | Neutral action: Edit, Back, Export, Cancel (non-destructive) |
| `ghost` | Text-only | Low-priority action: Cancel (modal footer), column-level links |
| `destructive` | Filled red | Irreversible negative: "Reject", "Delete" |
| `link` | Underlined text | Navigation inside content, not action buttons |

#### Sizes

| Size | Class | When to use |
|------|-------|-------------|
| Default | (no size prop) | All standard page actions |
| `sm` | `h-9 px-3` | Inside cards, compact toolbars, filter bars |
| `lg` | `h-11 px-8` | Full-width form submit, landing page CTAs |
| `icon` | `h-9 w-9` | Icon-only buttons (table row actions) |

#### Icon in Button

```tsx
// Icon LEFT of label (most common)
<Button>
  <Plus className="mr-2 h-4 w-4" /> Add UOM
</Button>

// Icon-only (ghost, table actions)
<Button variant="ghost" size="icon" title="Edit">
  <Pencil className="h-4 w-4" />
</Button>

// Loading spinner replaces icon
<Button disabled={isPending}>
  {isPending
    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    : <Plus className="mr-2 h-4 w-4" />}
  {isPending ? "Saving…" : "Save"}
</Button>
```

#### Header Action Buttons (PageHeader actions slot)

All buttons in a `PageHeader` actions slot use the **same size (default, 36px)**. Below `sm` they collapse to **icon-only**: wrap the label in `hidden sm:inline`, keep the icon always visible, and add `aria-label` so the icon-only button stays accessible. Dropdown chevrons may stay visible on mobile.

```tsx
<Button onClick={openCreate} aria-label="New product">
  <Plus className="h-4 w-4" />
  <span className="hidden sm:inline">New product</span>
</Button>
```

- No `mr-2` on the icon here — rely on the Button's built-in `gap-2`, so the hidden label leaves no stray margin on mobile
- The PageHeader actions slot is already `flex flex-wrap items-center gap-2` — never remove the wrap
- Reference: `src/app/(dashboard)/finance/product-master/product-master-page-client.tsx` (Import / Export / New product)

#### Action Bar Pattern (Detail Pages)

```tsx
<div className="flex flex-wrap items-center gap-2">
  {/* Primary actions — left-aligned */}
  <Button>Submit</Button>
  <Button variant="secondary">Verify</Button>
  <Button variant="outline">Edit</Button>

  {/* Separator to push destructive/cancel to right */}
  <div className="flex-1" />

  {/* Trailing actions — right-aligned */}
  <Button variant="outline">Close</Button>
  <Button variant="ghost">
    <Ban className="mr-2 h-4 w-4" /> Cancel
  </Button>
</div>
```

**Rules:**
- `flex-wrap` on action bar — buttons wrap on narrow screens, never overlap
- `disabled` when mutation `isPending` — always prevent double-submit
- Destructive actions (`variant="destructive"`) must open a `ConfirmDialog`, not execute immediately
- Never more than 2 "default" (primary) buttons in the same action bar
- "Cancel" in a dialog footer is `variant="outline"`, not `variant="ghost"`
- "Cancel" as a workflow abort (cancelling a request) is `variant="ghost"` in the action bar

---

### 5.4 Card

Cards are the primary content containers. All cards use shadcn `<Card>` — never raw `<div className="rounded border">`.

#### Standard Card (List Pages)

```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-sm font-semibold">UOM List</CardTitle>
    <CardDescription>All active and inactive units of measure</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* filters, table, pagination */}
  </CardContent>
</Card>
```

#### Card with Right Slot (badge / action)

```tsx
<CardHeader className="flex flex-row items-center justify-between space-y-0">
  <CardTitle className="text-sm font-semibold">Fill tracking</CardTitle>
  <span className="text-xs text-muted-foreground">3/5 approved</span>
</CardHeader>
```

When there's also a subtitle + right action:
```tsx
<CardHeader className="flex flex-row items-start justify-between space-y-0">
  <div>
    <CardTitle className="text-sm font-semibold">Attachments</CardTitle>
    <p className="mt-1 text-xs text-muted-foreground">Max 25 MB per file.</p>
  </div>
  <Button variant="outline" size="sm">Upload</Button>
</CardHeader>
```

#### Card with Icon in Header

```tsx
<CardHeader>
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <History className="h-4 w-4 text-muted-foreground" />
      <CardTitle className="text-sm font-semibold">Approval trace</CardTitle>
    </div>
    <span className="text-xs text-muted-foreground">6 events</span>
  </div>
</CardHeader>
```

#### Detail Header Card (top card of detail pages)

```tsx
<Card>
  <CardHeader>
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <div className="font-mono text-xs text-muted-foreground">{request.requestNo}</div>
        <CardTitle>{request.title}</CardTitle>
      </div>
      {/* Use finance/cost-product-request/status-badge for size="lg" */}
      <StatusBadge status={status} size="lg" />
    </div>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
      <Field label="Type">{request.requestTypeCode}</Field>
      <Field label="Urgency">{humanizeEnumValue(request.urgencyLevel)}</Field>
    </div>
    {request.description && (
      <div className="border-t pt-4">
        <p className="text-xs text-muted-foreground mb-1">Description</p>
        <p className="text-sm whitespace-pre-wrap">{request.description}</p>
      </div>
    )}
  </CardContent>
</Card>
```

#### Destructive / Warning Card (reject reason, error)

```tsx
<Card className="border-destructive/40">
  <CardHeader>
    <div className="flex items-center gap-2">
      <CardTitle className="text-sm font-semibold">Reject reason</CardTitle>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive" />
    </div>
  </CardHeader>
  <CardContent>
    <p className="text-sm whitespace-pre-wrap">{request.rejectReason}</p>
  </CardContent>
</Card>
```

#### Field Component (inside detail cards)

```tsx
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  )
}
```

For section-labelled fields (in review assessment cards):
```tsx
<div className="space-y-1">
  <div className="text-xs uppercase tracking-wide text-muted-foreground">Classification</div>
  <div className="text-sm">{value}</div>
</div>
```

**Rules:**
- `CardTitle` is **always** `text-sm font-semibold` — add the class, never rely on shadcn default
- `CardDescription` is `text-sm text-muted-foreground` — use shadcn component, never a `<p>` outside it
- `CardContent` gets `className="space-y-4"` when it has multiple field groups
- Detail cards (read-only field grids) use `className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm"` inside `CardContent`

---

### 5.5 Checkbox

#### Standalone (filter / bulk select)

```tsx
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

<div className="flex items-center gap-2">
  <Checkbox id="show-inactive" checked={showInactive} onCheckedChange={setShowInactive} />
  <Label htmlFor="show-inactive" className="text-sm font-normal">Show inactive</Label>
</div>
```

#### Inside Form (react-hook-form)

```tsx
<FormField
  control={form.control}
  name="isActive"
  render={({ field }) => (
    <FormItem className="flex flex-row items-start gap-3 space-y-0">
      <FormControl>
        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
      </FormControl>
      <div className="space-y-1 leading-none">
        <FormLabel>Active</FormLabel>
        <FormDescription>Visible in dropdowns and listings</FormDescription>
      </div>
    </FormItem>
  )}
/>
```

**Rules:**
- Always pair with a `<Label>` (or `<FormLabel>`) — never a bare checkbox
- `items-start` not `items-center` when there's a description below the label
- `space-y-0` on `FormItem` to override shadcn's default vertical spacing

---

### 5.6 Combobox

Comboboxes are searchable select + async-fetch dropdowns. All shared comboboxes live in `src/components/finance/comboboxes/` and `src/components/iam/`.

#### Usage Pattern

```tsx
// A domain-specific combobox — wraps CommandInput + CommandList + async fetch
import { ProductTypeCombobox } from "@/components/finance/comboboxes"

<FormField
  control={form.control}
  name="productTypeId"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Product Type <span className="text-destructive">*</span></FormLabel>
      <FormControl>
        <ProductTypeCombobox
          value={field.value}
          onSelect={field.onChange}
          placeholder="Select product type…"
          disabled={isPending}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

#### Building a New Combobox

```tsx
"use client"
import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface Props {
  value: string
  onSelect: (id: string) => void
  placeholder?: string
  disabled?: boolean
}

export function ExampleCombobox({ value, onSelect, placeholder = "Select…", disabled }: Props) {
  const [open, setOpen] = useState(false)
  const { data } = useMyData()
  const items = data?.items ?? []
  const selected = items.find((i) => i.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {selected ? selected.name : <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search…" />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.name}
                  onSelect={() => { onSelect(item.id); setOpen(false) }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === item.id ? "opacity-100" : "opacity-0")} />
                  {item.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

**Rules:**
- `w-full justify-between font-normal` on the trigger button — comboboxes are always full-width in forms
- `w-[--radix-popover-trigger-width]` on PopoverContent — dropdown is same width as trigger
- Placeholder text uses `text-muted-foreground` — never the default foreground color
- Always `CommandEmpty` — "No results." message when search returns nothing
- Never use `<Select>` for data that requires async fetch or search

#### Multi-Select Combobox

For multi-value filters (e.g. product types), use the same Popover + Command shell with these additions — reference `src/components/finance/comboboxes/product-type-multi-combobox.tsx`:

- The popover **stays open** when an item is toggled — do not `setOpen(false)` in `onSelect`
- Selected state via the Check-icon opacity convention (`opacity-100` selected / `opacity-0` not)
- The trigger shows a **count badge** ("N selected") when multiple values are selected
- A "Clear selection" `CommandItem` lives **inside the popover** — **never** nest an interactive element (inline ✕, `<span role="button">`) inside the trigger `<button>`: it's an invalid HTML content model and breaks accessibility

---

### 5.7 Date Picker

Use shadcn Calendar + Popover. For most cases a plain `<Input type="date">` is sufficient.

```tsx
// Simple — use Input type="date" for most forms
<FormField
  control={form.control}
  name="neededByDate"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Needed by</FormLabel>
      <FormControl>
        <Input type="date" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>

// Rich picker — use when you need calendar UI or date range
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
      <CalendarIcon className="mr-2 h-4 w-4" />
      {date ? format(date, "PPP") : "Pick a date"}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0" align="start">
    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
  </PopoverContent>
</Popover>
```

---

### 5.8 Dialog — Short Form

For forms with **5 or fewer fields**. Uses standard `<DialogContent>`.

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-[480px]">
    <DialogHeader>
      <DialogTitle>{uom ? "Edit UOM" : "Add UOM"}</DialogTitle>
      <DialogDescription>
        {uom ? "Update unit details." : "Create a new unit of measure."}
      </DialogDescription>
    </DialogHeader>

    <Form {...form}>
      <form id="uom-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* fields */}
      </form>
    </Form>

    <DialogFooter>
      <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
        Cancel
      </Button>
      <Button type="submit" form="uom-form" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {uom ? "Update" : "Create"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Widths:**
| Form complexity | Width |
|-----------------|-------|
| Very simple (2–3 fields) | `sm:max-w-[400px]` |
| Standard (4–5 fields) | `sm:max-w-[480px]` |
| Medium (complex fields, selects) | `sm:max-w-[560px]` |

---

### 5.9 Dialog — Tall Form (ScrollableDialog)

For forms with **6+ fields** or fields that may be dynamically added. Uses `<ScrollableDialogContent>` from `src/components/common/scrollable-dialog.tsx`.

```tsx
import {
  ScrollableDialogContent,
  ScrollableDialogHeader,
  ScrollableDialogBody,
  ScrollableDialogFooter,
} from "@/components/common/scrollable-dialog"

<Dialog open={open} onOpenChange={onOpenChange}>
  <ScrollableDialogContent className="sm:max-w-[560px]">
    <ScrollableDialogHeader>
      <DialogTitle>Edit User</DialogTitle>
      <DialogDescription>Update user details and roles.</DialogDescription>
    </ScrollableDialogHeader>

    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col min-h-0">
        <ScrollableDialogBody className="space-y-4">
          {/* all form fields */}
        </ScrollableDialogBody>
        <ScrollableDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </ScrollableDialogFooter>
      </form>
    </Form>
  </ScrollableDialogContent>
</Dialog>
```

**Rules:**
- Header and footer are sticky — they never scroll
- Body has `overflow-y-auto` max-height — only body scrolls
- `flex flex-1 flex-col min-h-0` on `<form>` — required for scroll to work correctly
- Use when a form could realistically overflow a 768px viewport

---

### 5.10 Dialog — Confirm / Destructive

Always use `<ConfirmDialog>` from `src/components/shared/confirm-dialog/`. Never use `window.confirm()`.

```tsx
<ConfirmDialog
  open={!!deleteTarget}
  title="Delete UOM"
  description={`"${deleteTarget?.uomName}" will be permanently deleted. This action cannot be undone.`}
  confirmLabel="Delete"
  confirmVariant="destructive"
  isLoading={deleteM.isPending}
  onConfirm={() => {
    deleteM.mutate(deleteTarget!.uomId, { onSuccess: () => setDeleteTarget(null) })
  }}
  onCancel={() => setDeleteTarget(null)}
/>
```

**Rules:**
- `confirmVariant="destructive"` for all delete/reject/cancel operations
- Description must mention the item name and consequence
- "This action cannot be undone." — always include for irreversible actions
- `isLoading={mutation.isPending}` — prevent double-confirm

---

### 5.11 Drawer / Sheet

Used for complex secondary UI that stays in context without full navigation.

```tsx
<Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent
    side="right"
    showCloseButton={false}
    className="flex flex-col p-0 w-full sm:max-w-2xl gap-0"
  >
    {/* Sticky header */}
    <div className="flex shrink-0 items-start gap-3 border-b bg-background px-6 py-4">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="font-mono text-xs font-normal">REQ-106</Badge>
          <StatusBadge status={status} type="request" />
        </div>
        <SheetTitle className="text-base font-semibold leading-tight">Sheet title</SheetTitle>
        <SheetDescription className="text-xs text-muted-foreground">Subtitle</SheetDescription>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={onClose}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <SheetClose asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <X className="h-4 w-4" /><span className="sr-only">Close</span>
          </Button>
        </SheetClose>
      </div>
    </div>

    {/* Scrollable body — ONLY this scrolls */}
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
      {/* content */}
    </div>

    {/* Sticky footer */}
    <div className="flex shrink-0 items-center justify-between gap-4 border-t bg-background px-6 py-4">
      <p className="text-sm text-muted-foreground">Progress info</p>
      <Button>Submit</Button>
    </div>
  </SheetContent>
</Sheet>
```

**Rules:**
- `showCloseButton={false}` — always suppress default X, add your own
- `flex flex-col p-0 gap-0` on `SheetContent` — removes shadcn defaults
- Header and footer `shrink-0` + `bg-background` + `border-b`/`border-t` + `px-6 py-4` — prevent content bleeding through
- `flex-1 overflow-y-auto` on body — only body scrolls
- `SheetTitle` and `SheetDescription` always present (accessibility — can be `sr-only`)
- `w-full sm:max-w-2xl` — full width on mobile, capped on desktop

**Read-only detail drawers** (quick-view from a list row) — reference `src/components/finance/cost-product-master/product-detail-drawer.tsx`:
- Body: `flex-1 overflow-y-auto px-6 py-5 space-y-4`; each content section wrapped in its own `rounded-lg border bg-card p-4` card
- Sections load **independently**: per-section loading skeleton while fetching, inline muted error text on failure — a failed section never blanks the whole drawer
- Detail queries pass `enabled` only while the drawer is open — nothing fetches while closed
- Footer always includes a link to the full detail page
- Grouped parameter display: group by `displayGroup` ordered by min `displayOrder` within each group — named groups first, ungrouped last (the algorithm lives in `src/components/finance/cost-results/cost-breakdown-modal.tsx` — reuse it, don't reinvent)

---

### 5.12 DropdownMenu

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">
      <Download className="mr-2 h-4 w-4" />
      Export/Import
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={handleExport} disabled={exportM.isPending}>
      <Download className="mr-2 h-4 w-4" />
      Export to Excel
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={() => setImportOpen(true)}>
      <Upload className="mr-2 h-4 w-4" />
      Import from Excel
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem
      onClick={handleDelete}
      className="text-destructive focus:text-destructive"
    >
      <Trash2 className="mr-2 h-4 w-4" />
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Rules:**
- `align="end"` on `DropdownMenuContent` when triggered from right side (common for Export/Import, row `...` menus)
- `align="start"` when triggered from left (navigation menus)
- Destructive items: `className="text-destructive focus:text-destructive"` — no separate variant prop
- `<DropdownMenuSeparator />` to group related items
- Icons: `mr-2 h-4 w-4` — same as in buttons

---

### 5.13 EmptyState

```tsx
<EmptyState
  title="No units of measure found"
  description="Try adjusting your search or filter criteria."
  action={
    <Button onClick={() => setCreateOpen(true)}>
      <Plus className="mr-2 h-4 w-4" /> Add First UOM
    </Button>
  }
/>
```

Use `icon` prop to override default (`Inbox`):
```tsx
<EmptyState
  icon={FileX}
  title="No results match"
  description="Clear filters to see all records."
/>
```

**Rules:**
- Every list/table must render `<EmptyState>` when data is empty (handled automatically by `DataTable`)
- For card sections (attachments, comments, timeline): use inline empty message, not full `EmptyState`
- `action` prop: only include if there's a meaningful user action (create, clear filters)

---

### 5.14 Form Fields (all)

All form fields use React Hook Form + Zod + shadcn `<Form>` components.

#### Required Pattern for Every Field

```tsx
<FormField
  control={form.control}
  name="fieldName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Label <span className="text-destructive">*</span></FormLabel>
      <FormControl>
        {/* Input / Select / etc. */}
      </FormControl>
      <FormDescription>Optional helper text.</FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Rules for all fields:**
- `*` for required fields: `<span className="text-destructive">*</span>` — always inline next to label
- `<FormDescription>` for hint text — never a separate `<p>` below the field
- `<FormMessage />` always last — shows validation errors
- `disabled={isPending}` on every input — prevent edits while submitting
- `form.reset()` in `useEffect([open, target])` — reset on every open to prevent stale values

#### Switch Inside Form

```tsx
<FormField
  control={form.control}
  name="isActive"
  render={({ field }) => (
    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
      <div className="space-y-0.5">
        <FormLabel>Active</FormLabel>
        <FormDescription>Inactive records are hidden in dropdowns</FormDescription>
      </div>
      <FormControl>
        <Switch checked={field.value ?? true} onCheckedChange={field.onChange} disabled={isPending} />
      </FormControl>
    </FormItem>
  )}
/>
```

Note: `FormLabel` inside a Switch FormItem uses **default size** (shadcn `text-sm font-medium`), not `text-base`.

#### Checkbox Inside Form

See §5.5.

#### Radio Group Inside Form

See §5.19.

#### Select Inside Form

```tsx
<FormField
  control={form.control}
  name="urgencyLevel"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Urgency <span className="text-destructive">*</span></FormLabel>
      <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select urgency…" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {URGENCY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

---

### 5.15 Input

```tsx
// Standard
<Input placeholder="e.g., KG" {...field} />

// Uppercase-auto
<Input
  placeholder="e.g., MTG"
  {...field}
  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
  className="uppercase"
/>

// With leading icon
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
  <Input placeholder="Search…" className="pl-9" {...field} />
</div>

// Read-only / disabled
<Input value={record.code} disabled className="bg-muted" />
```

**Rules:**
- `disabled` not `readOnly` for non-editable fields inside a form
- `className="uppercase"` + `onChange` toUpperCase for code fields
- Leading icons: `left-3 top-1/2 -translate-y-1/2` + `pl-9` on input
- Never set width explicitly — let the form grid/container control width

---

### 5.16 KpiCard / KpiGrid

```tsx
<KpiGrid cols={4}>
  <KpiCard
    title="Total Requests"
    value={data?.totalItems ?? 0}
    icon={FileText}
    loading={isLoading}
  />
  <KpiCard
    title="Approved"
    value={approved}
    variant="success"
    icon={CheckCircle2}
    loading={isLoading}
  />
  <KpiCard
    title="Pending Review"
    value={pending}
    variant="warning"
    icon={Clock}
    loading={isLoading}
  />
  <KpiCard
    title="Rejected"
    value={rejected}
    variant="destructive"
    icon={XCircle}
    loading={isLoading}
  />
</KpiGrid>
```

**Props:**

| Prop | Type | Notes |
|------|------|-------|
| `title` | `string` | Short label, title case |
| `value` | `ReactNode` | Usually a number or string |
| `variant` | `"default" \| "success" \| "warning" \| "destructive"` | Controls icon and number color |
| `icon` | `LucideIcon` | Optional icon |
| `loading` | `boolean` | Shows skeleton when true |
| `delta` | `KpiDelta` | Optional trend line |
| `href` | `string` | Makes card clickable (navigates) |

**Rules:**
- Always `loading={isLoading}` — skeleton prevents layout shift
- Place `<KpiGrid>` directly under `<PageHeader>`, before the main list card
- Use `href` to make KPI cards link to a filtered list view when possible
- `cols` prop: 2 for simple pages, 3–4 for dashboards
- **Count widgets use the neutral `default` variant** — reserve `success`/`warning`/`destructive` for semantic alerts (failed jobs, pending reviews), never for plain category counts like Active/Inactive (reference: `/finance/product-master` KPI row)
- `KpiGrid` handles odd card counts on mobile automatically (the last card spans the full 2-col row) — do not add manual `col-span` overrides on children

---

### 5.17 PageHeader

```tsx
<PageHeader
  title="Unit of Measure"
  subtitle="Manage units used in costing calculations"
>
  {/* Action buttons — rendered right-aligned on desktop */}
  <Button variant="outline" onClick={handleExport}>
    <Download className="mr-2 h-4 w-4" /> Export
  </Button>
  <Button onClick={() => setCreateOpen(true)}>
    <Plus className="mr-2 h-4 w-4" /> Add UOM
  </Button>
</PageHeader>
```

**Responsive behavior (built into the component):**
- Mobile: title/subtitle stacked, buttons below in a `flex-wrap` row
- Desktop (`md:`): title left, buttons right on same line

**Rules:**
- Always the **first element** inside a page's root `div`
- `title` = module/entity name (e.g., "Product Requests", "User Management")
- `subtitle` = brief description of what the user can do (1 sentence max)
- Children = action buttons only — no filters, no search in PageHeader
- On detail pages: `title={record.code}` + `subtitle={record.name}` pattern
- Back button always `variant="outline"` with `<ArrowLeft>` icon

---

### 5.18 Pagination

Always use `<DataTablePagination>` from `src/components/shared/data-table/data-table-pagination.tsx`.

```tsx
<DataTablePagination
  currentPage={filters.page ?? 1}
  pageSize={filters.pageSize ?? 10}
  totalItems={Number(data?.pagination?.totalItems ?? 0)}  // proto = string, cast!
  totalPages={data?.pagination?.totalPages ?? 0}
  onPageChange={(page) => setFilters({ ...filters, page })}
  onPageSizeChange={(pageSize) => setFilters({ ...filters, pageSize, page: 1 })}
/>
```

**Rules:**
- `totalItems` from proto is a **string** — always cast `Number(...)`
- `page: 1` reset when `pageSize` changes
- Renders nothing when `totalItems === 0` (built-in)
- Place inside `CardContent` after the table, as the last element

---

### 5.19 Radio / RadioGroup

#### Standalone

```tsx
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

<RadioGroup value={value} onValueChange={onChange} className="flex flex-col space-y-2">
  <div className="flex items-center gap-2">
    <RadioGroupItem value="new" id="cls-new" />
    <Label htmlFor="cls-new" className="font-normal">New product</Label>
  </div>
  <div className="flex items-center gap-2">
    <RadioGroupItem value="existing" id="cls-existing" />
    <Label htmlFor="cls-existing" className="font-normal">Existing product</Label>
  </div>
</RadioGroup>
```

#### Inside Form

```tsx
<FormField
  control={form.control}
  name="productClassification"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Classification <span className="text-destructive">*</span></FormLabel>
      <FormControl>
        <RadioGroup
          value={field.value}
          onValueChange={field.onChange}
          className="flex flex-col space-y-2 pt-1"
        >
          {CLASSIFICATION_OPTIONS.map((o) => (
            <div key={o.value} className="flex items-center gap-2">
              <RadioGroupItem value={o.value} id={`cls-${o.value}`} />
              <Label htmlFor={`cls-${o.value}`} className="font-normal cursor-pointer">
                {o.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

#### Horizontal (2–3 options)

```tsx
<RadioGroup value={value} onValueChange={onChange} className="flex gap-4">
  <div className="flex items-center gap-2">
    <RadioGroupItem value="yes" id="opt-yes" />
    <Label htmlFor="opt-yes" className="font-normal">Yes</Label>
  </div>
  <div className="flex items-center gap-2">
    <RadioGroupItem value="no" id="opt-no" />
    <Label htmlFor="opt-no" className="font-normal">No</Label>
  </div>
</RadioGroup>
```

**Rules:**
- `font-normal` on `<Label>` — radio labels are not bold
- Always `id` + `htmlFor` pairing — for accessibility
- Vertical layout default, horizontal only for ≤3 short options
- Use radio (not Select) when options are ≤4 and always visible

---

### 5.20 Select

#### Filter Select (outside form)

```tsx
<Select
  value={String(filters.activeFilter ?? 0)}
  onValueChange={(v) => setFilters({ ...filters, activeFilter: Number(v), page: 1 })}
>
  <SelectTrigger className="w-[140px]">
    <SelectValue placeholder="Status" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="0">All Status</SelectItem>
    <SelectItem value="1">Active</SelectItem>
    <SelectItem value="2">Inactive</SelectItem>
  </SelectContent>
</Select>
```

#### Form Select

See §5.14.

**Width guidelines:**
| Content | Width |
|---------|-------|
| Status filter (2–3 options) | `w-[140px]` |
| Category filter | `w-[160px]` |
| Sort selector | `w-[150px]` |
| Full-width in form | (no width — let container control) |
| Page size selector | `w-[70px]` h-8 |

---

### 5.21 Slider

```tsx
import { Slider } from "@/components/ui/slider"

// Standalone
<div className="space-y-2">
  <Label>Volume ({value[0]}%)</Label>
  <Slider
    min={0}
    max={100}
    step={1}
    value={value}
    onValueChange={setValue}
    className="w-full"
  />
  <div className="flex justify-between text-xs text-muted-foreground">
    <span>0%</span>
    <span>100%</span>
  </div>
</div>

// Inside form
<FormField
  control={form.control}
  name="coveragePercent"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Coverage: {field.value}%</FormLabel>
      <FormControl>
        <Slider
          min={0} max={100} step={5}
          value={[field.value]}
          onValueChange={([v]) => field.onChange(v)}
          className="w-full"
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Rules:**
- Always show the current value in the label
- Show min/max labels below the slider
- `step` should match meaningful increments (1 for %, 100 for IDR amounts)

---

### 5.22 StatusBadge

> Always use `<StatusBadge>` for entity status display. Never use raw `<Badge>` for status values.

There are **two** StatusBadge implementations — use the correct one per context:

**General use** (`src/components/common/status-badge.tsx`) — use everywhere except request detail headers:
```tsx
import { StatusBadge } from "@/components/common/status-badge"

// In tables (small)
<StatusBadge status={row.status} type="request" size="sm" />

// Default (medium) — list pages, cards
<StatusBadge status={row.status} type="request" />

// Active/Inactive for master data
<StatusBadge status={row.isActive ? "ACTIVE" : "INACTIVE"} type="product" />
```
Supported sizes: `"sm"` | `"md"` (default)

**Finance request detail only** (`src/components/finance/cost-product-request/status-badge.tsx`) — large display in detail page header:
```tsx
import { StatusBadge } from "@/components/finance/cost-product-request/status-badge"

// In request detail header (prominent display)
<StatusBadge status={status} substatus={request.closedSubstatus} size="lg" />
```
Supported sizes: `"default"` | `"lg"`

> **Roadmap**: The common StatusBadge will gain `size="lg"` in a future polish pass, consolidating both into one component.

**Available types (from `src/lib/ui/status-colors.ts`):**

| Type | Statuses |
|------|---------|
| `"request"` | DRAFT, SUBMITTED, UNDER_REVIEW, ROUTING_DEFINED, PARAMETER_PENDING, PARAMETER_COMPLETE, COSTING_DONE, QUOTED, QUOTE_READY, CLOSED, REJECTED |
| `"route"` | DRAFT, COMPLETE, LOCKED |
| `"job"` | QUEUED, PROCESSING, SUCCESS, PARTIAL_FAILED, FAILED, CANCELLED |
| `"chunk"` | PENDING, PROCESSING, SUCCESS, PARTIAL_FAILED, FAILED |
| `"cost"` | CALCULATED, VERIFIED, APPROVED, SUPERSEDED |
| `"product"` | ACTIVE, INACTIVE |
| `"generic"` | Auto-prettifies unknown strings |

**Adding new statuses:** Edit only `src/lib/ui/status-colors.ts` — add to the relevant type registry. Never add inline badge className overrides.

---

### 5.23 Switch

#### Standalone

```tsx
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

<div className="flex items-center gap-2">
  <Switch id="dark-mode" checked={isDark} onCheckedChange={setIsDark} />
  <Label htmlFor="dark-mode">Dark mode</Label>
</div>
```

#### Inside Form (bordered card style)

```tsx
<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
  <div className="space-y-0.5">
    <FormLabel>Active</FormLabel>
    <FormDescription>Inactive records are hidden in dropdowns</FormDescription>
  </div>
  <FormControl>
    <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
  </FormControl>
</FormItem>
```

**Rules:**
- Bordered card style (`rounded-lg border p-4`) when Switch has both label + description — it visually separates it from text inputs above
- Simple inline style (`flex items-center gap-2`) when Switch is standalone or in a compact setting
- `FormLabel` inside Switch FormItem uses default size (no `text-base` override)
- `checked={field.value ?? true}` — default to `true` for "active" fields

---

### 5.24 Table (DataTable)

The shared `<DataTable>` handles: column definitions, column visibility menu, sticky columns, responsive row actions (desktop buttons / mobile dropdown), loading skeletons, and empty state.

#### Column Definition

```tsx
const columns: ColumnDef<MyEntity>[] = [
  {
    id: "code",
    header: "Code",
    width: "w-[120px]",           // Tailwind class width (for non-sticky)
    // widthPx: 120,              // Use for sticky columns — enables auto-offset calculation
    sticky: "left",               // "left" | "right" — makes column sticky
    cell: (row) => (
      <span className="font-mono text-sm">{row.code}</span>
    ),
  },
  {
    id: "name",
    header: "Name",
    accessorKey: "name",          // Simple accessor — renders row.name as string
    hideOnMobile: true,           // Hidden on small screens
  },
  {
    id: "status",
    header: "Status",
    width: "w-[120px]",
    cell: (row) => <StatusBadge status={row.status} type="product" size="sm" />,
  },
]
```

#### Column Visibility (show/hide)

Pass `tableId` to enable the column visibility menu (⚙ button top-right):

```tsx
<DataTable
  data={items}
  columns={columns}
  keyField="id"
  actions={actions}
  isLoading={isLoading}
  tableId="my-entity-table"       // Enables column show/hide; persisted to localStorage
  stickyActions                   // Sticks the Actions column to the right
  emptyMessage="No records found"
  emptyDescription="Try adjusting your filters."
/>
```

For **custom tables** (not `DataTable`), any table with **more than 6 columns** gets `useColumnVisibility(tableId, columns)` + `<ColumnVisibilityMenu>` (both in `src/components/shared/data-table/`):

- `tableId` convention: `<module>-<entity>` (e.g. `finance-product-master`)
- The identity/key column is `canHide: false` — users can never hide it
- Hoist the hook to the page component (see RULES.md Mistake 9) and pass `visibility` down to the table
- When the menu trigger sits in an h-9 filter row, pass `className="h-9"` (trigger defaults to h-8)
- Reference: `useProductMasterTableColumns()` in `src/components/finance/cost-product-master/product-master-table.tsx`

#### Sortable Columns

Column sorting is always **server-side**, flowing through `filters.sortBy` / `filters.sortOrder` into the list hook:

- Sort keys must match the proto `sort_by` `buf.validate` `in`-list values — never invent frontend-only keys
- Every sort change (like every filter change) resets `page: 1`
- **`useUrlState` only tracks keys present in `defaultValues`** — `sortBy`/`sortOrder` MUST be listed in the page's `defaultFilters`, or header clicks are silently dropped (documented bug pattern; see RULES.md Mistake 12)

For **column-header click sort**, use the shared **`SortableHeader`** (`src/components/shared/data-table/sortable-header.tsx`) — never build ad-hoc sort buttons inside headers:

- fa-sort-style stacked-triangle SVG indicator: both triangles muted when inactive; the active direction's triangle filled
- The **whole `TableHead`** is the click target — `cursor-pointer select-none`, **no hover background**
- Accessibility built in: `aria-sort`, `tabIndex={0}`, Enter/Space keyboard activation

```tsx
<SortableHeader
  label="Product Code"
  sortKey="product_code"          // must be a proto-validated sort_by value
  currentSortBy={sortBy}
  currentSortOrder={sortOrder}
  onSort={onSort}
/>
```

Direction cycling is owned by the page client — asc ↔ desc on the active column, a new column always starts asc:

```tsx
function handleSort(sortKey: string) {
  const nextOrder = filters.sortBy === sortKey && filters.sortOrder === "asc" ? "desc" : "asc"
  setFilters({ ...filters, sortBy: sortKey, sortOrder: nextOrder, page: 1 })
}
```

Reference implementation: `product-master-table.tsx` + `product-master-page-client.tsx` (`/finance/product-master`).

In `DataTable` columns, add `sortKey` to the column definition and handle in the parent:
```tsx
{
  id: "name",
  header: "Name",
  sortKey: "name",       // Passed up to onSort callback
  accessorKey: "name",
}
```

#### Row-Click Navigation

When list rows navigate to a detail page:

- `onClick` on the `TableRow` + `cursor-pointer`
- The actions cell must call `stopPropagation` so action buttons don't trigger navigation
- Do **not** also render a `<Link>` on the identity column — it stays plain text (no link-inside-clickable-row)

#### Row Actions

```tsx
const actions: RowAction<MyEntity>[] = [
  {
    id: "edit",
    label: "Edit",
    icon: <Pencil className="h-4 w-4" />,
    onClick: (row) => setEditTarget(row),
  },
  {
    id: "view",
    label: "View details",
    icon: <Eye className="h-4 w-4" />,
    onClick: (row) => router.push(`/path/${row.id}`),
  },
  {
    id: "delete",
    label: "Delete",
    icon: <Trash2 className="h-4 w-4" />,
    onClick: (row) => setDeleteTarget(row),
    variant: "destructive",
    disabled: (row) => !row.canDelete,     // Conditional disable
  },
]
```

**Rules:**
- `keyField` or `getRowKey` always required — prevents React key warnings
- `stickyActions` when table has many columns (5+) so actions are always visible on scroll
- `tableId` for all tables with 5+ columns — enables user-controlled column visibility
- `hideOnMobile: true` on secondary columns (description, timestamps) — prevents mobile overflow
- `widthPx` (number) for sticky columns — required for correct offset calculation
- `width` (Tailwind class) for non-sticky width constraints
- Actions: show ≤4 icon buttons on desktop, collapse to `...` dropdown on mobile (automatic)

---

### 5.25 Tabs

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="parameters">Parameters</TabsTrigger>
    <TabsTrigger value="audit">Audit Log</TabsTrigger>
  </TabsList>

  <TabsContent value="overview" className="mt-4 space-y-4">
    {/* overview content */}
  </TabsContent>
  <TabsContent value="parameters" className="mt-4">
    {/* parameters content */}
  </TabsContent>
  <TabsContent value="audit" className="mt-4">
    {/* audit content */}
  </TabsContent>
</Tabs>
```

**Inside a Card:**
```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-sm font-semibold">Product detail</CardTitle>
  </CardHeader>
  <CardContent>
    <Tabs defaultValue="spec">
      <TabsList className="w-full">
        <TabsTrigger value="spec" className="flex-1">Specification</TabsTrigger>
        <TabsTrigger value="routing" className="flex-1">Routing</TabsTrigger>
        <TabsTrigger value="cost" className="flex-1">Cost Results</TabsTrigger>
      </TabsList>
      <TabsContent value="spec" className="mt-4 space-y-4">...</TabsContent>
    </Tabs>
  </CardContent>
</Card>
```

**Rules:**
- `mt-4` on `TabsContent` — consistent spacing between tabs and content
- `className="w-full"` + `flex-1` on triggers when tabs should fill the container width
- Default: tabs do not fill width (triggers are auto-width)
- `space-y-4` or `space-y-6` on `TabsContent` for vertical rhythm of inner content

---

### 5.26 Textarea

```tsx
// Standard
<FormField
  control={form.control}
  name="description"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Description</FormLabel>
      <FormControl>
        <Textarea
          placeholder="Optional description…"
          rows={3}
          {...field}
          value={field.value ?? ""}
          disabled={isPending}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>

// Read-only multi-line text (in detail card — NOT a textarea)
<p className="text-sm whitespace-pre-wrap">{record.description}</p>
```

**Rules:**
- `rows={2}` short text, `rows={3}` default, `rows={5}` long text
- `whitespace-pre-wrap` on read-only display — preserves user line breaks
- Never use `<Textarea>` for display — only for input

---

### 5.27 Timeline

Used for audit trails and approval traces. See `ApprovalTraceTimeline` in `request-detail-panel.tsx` as the canonical implementation.

```tsx
<ol className="space-y-0">
  {entries.map((entry, i) => (
    <li key={entry.id} className="flex gap-3 min-w-0">
      {/* Connector */}
      <div className="flex shrink-0 flex-col items-center">
        <div className="mt-[0.4rem] h-2 w-2 rounded-full bg-muted-foreground/50 ring-2 ring-background" />
        {i < entries.length - 1 && (
          <div className="mt-1 w-px flex-1 bg-border" />
        )}
      </div>
      {/* Content */}
      <div className={cn("min-w-0 flex-1", i < entries.length - 1 ? "pb-4" : "pb-0")}>
        <p className="text-sm leading-snug">{entry.label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {entry.actor} · {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
        </p>
        {entry.note && (
          <p className="mt-1 text-xs italic text-muted-foreground/70 whitespace-pre-wrap">
            {entry.note}
          </p>
        )}
      </div>
    </li>
  ))}
</ol>
```

**Rules:**
- Connector line (`w-px flex-1 bg-border`) only between items, not after last item
- `ring-2 ring-background` on dot — creates visual separation from connector line
- `pb-4` on content of non-last items, `pb-0` on last — consistent spacing
- `min-w-0 flex-1` on content — prevents overflow from long text

---

### 5.28 Toast / Sonner

Toasts are triggered from hook mutation handlers. The `createCrudHooks` factory does this automatically. For manual toasts:

```tsx
import { toast } from "sonner"

// Success
toast.success("UOM created successfully.")

// Error
toast.error("Failed to create UOM.", {
  description: error?.message,
})

// Loading + result
const id = toast.loading("Exporting…")
// ... async work ...
toast.success("Export complete.", { id })

// Warning
toast.warning("Some rows were skipped.", {
  description: `${skipCount} rows had invalid data.`,
})
```

**Rules:**
- Success: past tense, period: `"User created."` not `"User created!"`
- Error: starts with "Failed to": `"Failed to delete UOM."`
- Include `description` for errors — show the actual error message
- Never show UUID in toast messages — use human-readable identifiers
- Do not show toasts for non-user-initiated events (background polls)
- Duration: default (4s) for success, longer or `{ duration: Infinity }` for errors with actions

---

### 5.29 Toggle / ToggleGroup

```tsx
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

// Single toggle (e.g., bold/italic in text editor)
<Toggle pressed={isBold} onPressedChange={setIsBold} size="sm" aria-label="Bold">
  <Bold className="h-4 w-4" />
</Toggle>

// Toggle group (mutually exclusive)
<ToggleGroup type="single" value={viewMode} onValueChange={setViewMode}>
  <ToggleGroupItem value="list" aria-label="List view">
    <List className="h-4 w-4" />
  </ToggleGroupItem>
  <ToggleGroupItem value="grid" aria-label="Grid view">
    <LayoutGrid className="h-4 w-4" />
  </ToggleGroupItem>
</ToggleGroup>

// Toggle group with labels
<ToggleGroup type="single" value={period} onValueChange={setPeriod} className="flex-wrap">
  <ToggleGroupItem value="day" className="text-xs">Day</ToggleGroupItem>
  <ToggleGroupItem value="week" className="text-xs">Week</ToggleGroupItem>
  <ToggleGroupItem value="month" className="text-xs">Month</ToggleGroupItem>
</ToggleGroup>
```

**Rules:**
- `aria-label` always on icon-only toggles
- Use `ToggleGroup type="single"` for view switchers, period selectors
- `type="multiple"` for multi-select filters (prefer checkboxes for list-style, use ToggleGroup for compact visual selectors)

---

### 5.30 Tooltip

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Wrap page root in TooltipProvider (already done in providers/index.tsx)

<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="icon" disabled={!canDoThing} title="...">
      <Info className="h-4 w-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>
    <p>Explain why the button is disabled or what it does.</p>
  </TooltipContent>
</Tooltip>
```

**Rules:**
- Use for icon-only buttons that lack visible labels
- Use for disabled buttons to explain WHY they are disabled
- Never use tooltip as the only way to convey critical information — the label or adjacent text should also convey it
- `asChild` on `TooltipTrigger` when wrapping a Button

---

## 6. Iconography

All icons come from `lucide-react`. Never use other icon libraries.

### Standard Icon Sizes

| Context | Size | Class |
|---------|------|-------|
| Button icon (left of label) | 16px | `mr-2 h-4 w-4` |
| Button icon-only | 16px | `h-4 w-4` |
| Notice/alert icon | 16px | `h-4 w-4 shrink-0` |
| Card header icon | 16px | `h-4 w-4 text-muted-foreground` |
| KPI card icon | 16px | `size-4` (inside `size-8` span) |
| EmptyState icon | 24px | `size-6` (inside `size-12` span) |
| Inline text icon | 12px | `h-3 w-3` or `size-3` |
| Navigation / sidebar | 16px | `h-4 w-4` |
| PageHeader back arrow | 16px | `mr-2 h-4 w-4` |

### Canonical Icon Choices

| Action | Icon |
|--------|------|
| Add / Create | `Plus` |
| Edit | `Pencil` |
| Delete / Remove | `Trash2` |
| View / Open | `Eye` |
| Search | `Search` |
| Filter | `SlidersHorizontal` |
| Sort | `ArrowUpDown` |
| Export / Download | `Download` |
| Import / Upload | `Upload` |
| Refresh | `RotateCcw` |
| Close / Cancel | `X` |
| Go back | `ArrowLeft` |
| External link | `ExternalLink` |
| Settings | `Settings` |
| Info | `Info` |
| Warning | `AlertTriangle` |
| Error | `XCircle` |
| Success / Approve | `CheckCircle2` |
| History / Audit | `History` |
| Calendar / Date | `CalendarIcon` |
| User | `User` |
| Loading | `Loader2` (with `animate-spin`) |
| Copy | `Copy` |
| Expand / MoreH | `MoreHorizontal` |
| Expand / MoreV | `MoreVertical` |
| Ban / Readonly | `Ban` |

---

## 7. Dark Mode

Dark mode is enabled via `next-themes` and the `.dark` CSS class. All colors must use semantic tokens — never hardcoded hex. Tailwind `dark:` prefix handles dark-mode overrides.

### Dark-safe color patterns

```tsx
// ✓ Correct — semantic tokens adapt automatically
<div className="bg-muted text-muted-foreground">

// ✓ Correct — dark variants defined
<span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">

// ✗ Wrong — hardcoded, breaks dark mode
<div className="bg-gray-100 text-gray-600">
```

### Components that need dark: prefix

Whenever using semantic colors outside of the status registry, check if the dark variant is needed:

```tsx
// Orange annotation (used in review cards)
<span className="text-orange-600 dark:text-orange-400">→ {verifiedValue}</span>

// Amber warning border
<div className="border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10">

// Destructive card border
<Card className="border-destructive/40">  {/* /40 works in both modes */}
```
