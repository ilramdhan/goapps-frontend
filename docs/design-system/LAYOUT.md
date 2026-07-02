# GoApps Frontend — Layout & Responsive Design

> **Authority**: This document defines all layout, spacing, responsive, and scroll rules.  
> **Last updated**: 2026-06-15  
>
> **Related docs**:
> - [`DESIGN.md`](./DESIGN.md) — design tokens, component catalog
> - [`RULES.md`](./RULES.md) — AI generation checklist
> - [`../../CLAUDE.md`](../../CLAUDE.md) — architecture, patterns

---

## Table of Contents

1. [Breakpoints](#1-breakpoints)
2. [Dashboard Shell Anatomy](#2-dashboard-shell-anatomy)
3. [Scroll & Overflow Architecture](#3-scroll--overflow-architecture)
4. [Page-Level Layout Patterns](#4-page-level-layout-patterns)
   - [List Page](#41-list-page)
   - [Detail Page (Bento Grid)](#42-detail-page-bento-grid)
   - [Dashboard / Overview Page](#43-dashboard--overview-page)
   - [Form-Heavy Page (Wizard / Config)](#44-form-heavy-page-wizard--config)
5. [Card Grid Layouts](#5-card-grid-layouts)
6. [Table Responsiveness](#6-table-responsiveness)
7. [Dialog & Drawer Responsive](#7-dialog--drawer-responsive)
8. [Mobile Rules](#8-mobile-rules)
9. [Sticky Elements](#9-sticky-elements)
10. [Common Responsive Bugs & Fixes](#10-common-responsive-bugs--fixes)

---

## 1. Breakpoints

TailwindCSS 4 default breakpoints (same as v3):

| Prefix | Min-width | Typical device |
|--------|-----------|----------------|
| (none) | 0 | Mobile portrait (< 640px) |
| `sm:` | 640px | Mobile landscape / small tablet |
| `md:` | 768px | Tablet |
| `lg:` | 1024px | Desktop laptop |
| `xl:` | 1280px | Wide desktop |
| `2xl:` | 1536px | Ultra-wide |

### Key Breakpoint Decisions

- **Sidebar collapses**: controlled by shadcn `SidebarProvider` at `lg:` (1024px)
- **Bento grid switch** (1-col → 12-col): `lg:grid-cols-12` — detail pages go 2-column at 1024px
- **Action bar buttons wrap**: `flex-wrap` — always, at any width
- **Filter bar wrap**: `flex-col sm:flex-row` — stacks on mobile, inline from 640px
- **PageHeader stacks**: `flex-col md:flex-row` — title + buttons stacked on mobile, inline from 768px
- **Card field grid**: `grid-cols-2 md:grid-cols-4` — 2 cols mobile, 4 cols tablet+
- **Table**: always full-width (`w-full`), overflow scrolls **inside the card**, not the whole page

---

## 2. Dashboard Shell Anatomy

```
┌─────────────────────────────────────────────────────────┐
│ STICKY HEADER (z-50)                                    │
│ [sidebar toggle] [breadcrumb ..................] [notif] │
├──────────┬──────────────────────────────────────────────┤
│          │ MAIN CONTENT AREA                            │
│ SIDEBAR  │ p-4 pt-0                                     │
│ (sticky, │                                              │
│ collapsa)│   <main> flex-1 pt-4 min-w-0 w-full         │
│          │     <PageHeader />                           │
│          │     <Card /> (list or detail)                │
│          │   </main>                                    │
│          │                                              │
│          │ FOOTER                                       │
└──────────┴──────────────────────────────────────────────┘
```

### Shell Code (`src/app/(dashboard)/layout.tsx`)

```tsx
<SidebarProvider>
  <AppSidebar />
  <SidebarInset>
    {/* Sticky header */}
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex flex-1 items-center gap-2 px-4 min-w-0">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator orientation="vertical" className="mr-2 shrink-0 data-[orientation=vertical]:h-4" />
        <div className="min-w-0 flex-1 truncate">   {/* ← truncate prevents header overflow */}
          <DynamicBreadcrumb />
        </div>
        <NotificationBell />
      </div>
    </header>

    {/* Content area */}
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 min-w-0">   {/* ← min-w-0 critical */}
      <main className="flex-1 pt-4 min-w-0 w-full">                  {/* ← min-w-0 + w-full */}
        {children}
      </main>
      <Footer />
    </div>
  </SidebarInset>
</SidebarProvider>
```

### Critical Shell Classes

| Class | Where | Why |
|-------|-------|-----|
| `min-w-0` | `SidebarInset`, content div, `<main>` | Without this, flex children expand beyond parent → entire page scrolls horizontally |
| `w-full` | `<main>` | Fills available width |
| `flex-1` | content div, `<main>` | Fills remaining vertical height |
| `sticky top-0 z-50` | header | Stays visible while scrolling |
| `truncate` | breadcrumb container | Long breadcrumbs don't overflow header |
| `shrink-0` | `SidebarTrigger`, `<Separator>`, notification bell | Prevent squishing in flex row |

---

## 3. Scroll & Overflow Architecture

This is the **most critical layout rule**. The entire scrolling behavior of the app must follow this model:

### Correct Model: Only Content Scrolls

```
┌─────────────────────────────┐
│ HEADER (sticky, never moves)│ ← z-50, height fixed
├─────────────────────────────┤
│ SIDEBAR   │ PAGE CONTENT    │ ← flex row, fills viewport
│ (sticky)  │ overflow-y-auto │ ← page content scrolls vertically
│           │                 │
│           │ ┌─────────────┐ │
│           │ │ TABLE CARD  │ │
│           │ │ ┌─────────┐ │ │
│           │ │ │ TABLE   │ │ │ ← table overflows INSIDE the card (overflow-x-auto)
│           │ │ │ scrolls │ │ │   NOT the whole page
│           │ │ │ →       │ │ │
│           │ └─┴─────────┘ │ │
└─────────────────────────────┘
```

### Wrong Model: Whole Page Scrolls Horizontally

```
❌ When the page scrolls left-right, the header and sidebar move too.
   This happens when overflow is not properly contained.
```

### Rules to Prevent Horizontal Page Scroll

1. **Every flex container on the main axis must have `min-w-0`** — this is the #1 root cause of overflow
2. **Tables must be wrapped in `overflow-x-auto`** — only the table scrolls, not the card or page
3. **Never use `overflow-x-hidden` on body** — it hides scroll indicators and breaks sticky
4. **`w-full` on the table wrapper** — ensures it fills the card before trying to shrink

#### Correct Table Wrapping

```tsx
{/* Inside CardContent */}
<div className="w-full overflow-x-auto">
  <Table>
    {/* ... */}
  </Table>
</div>
```

The `DataTable` component already applies this internally. Do NOT add `overflow-x-auto` around `<DataTable>` — it's double-wrapped.

#### Cards Must Not Overflow

```tsx
{/* ✓ Correct */}
<Card className="min-w-0">   {/* or rely on parent min-w-0 */}
  <CardContent>
    <div className="overflow-x-auto">   {/* wraps ONLY the table */}
      <Table>...</Table>
    </div>
  </CardContent>
</Card>

{/* ✗ Wrong — card itself has no overflow constraint */}
<Card>
  <CardContent>
    <Table>...</Table>   {/* table can push card wider than viewport */}
  </CardContent>
</Card>
```

---

## 4. Page-Level Layout Patterns

### 4.1 List Page

**When**: Master data (UOM, Category, Company), transaction lists (Product Requests), audit logs.

```tsx
// root div — always space-y-6
<div className="space-y-6">

  <PageHeader title="Units of Measure" subtitle="...">
    <Button>Add UOM</Button>
  </PageHeader>

  {/* Optional KPI summary row */}
  <KpiGrid cols={3}>
    <KpiCard title="Total" value={total} loading={isLoading} />
    <KpiCard title="Active" value={active} variant="success" loading={isLoading} />
    <KpiCard title="Inactive" value={inactive} loading={isLoading} />
  </KpiGrid>

  {/* Main list card */}
  <Card>
    <CardHeader>
      <CardTitle className="text-sm font-semibold">UOM List</CardTitle>
      <CardDescription>{total} total units</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <UOMFilters filters={filters} onChange={setFilters} />
      {isError && <ErrorNotice />}
      <DataTable ... />
      <DataTablePagination ... />
    </CardContent>
  </Card>

</div>
```

**Order inside `CardContent`:**
1. Filter bar (`flex flex-wrap gap-3`)
2. Error notice (conditional)
3. DataTable
4. DataTablePagination

**Vertical rhythm**: the single root `space-y-6` is the ONLY spacing between header → KPI row → filters → table → pagination — no extra ad-hoc margins between these blocks. If `PageHeader`'s built-in bottom padding doubles the gap, pass `className="pb-0"` to it rather than adjusting neighbors.

**Flat list variant** (no wrapping Card — reference `/finance/product-master`): PageHeader → KpiGrid → filter toolbar → table → DataTablePagination sit directly under the root `space-y-6`. Rules for the flat table:
- Table wrapper: `rounded-md border` with an **inner** `overflow-x-auto` div — the table scrolls inside the border, not the page
- First column gets `pl-4` and last column `pr-4` — on **both** head and body cells — so content aligns with the rounded border
- Every control in the filter toolbar row is `h-9` (see DESIGN.md §4 — Control Height Parity)

---

### 4.2 Detail Page (Bento Grid)

**When**: Any entity with multiple related sections — product request, calc job, product master.

```tsx
<div className="space-y-6">

  <PageHeader title={record.code} subtitle={record.name}>
    <Button variant="outline" onClick={goBack}>
      <ArrowLeft className="mr-2 h-4 w-4" /> Back to list
    </Button>
  </PageHeader>

  {/* Read-only notice (conditional) */}
  {isTerminal && <TerminalNotice />}

  {/* Action bar */}
  <div className="flex flex-wrap items-center gap-2">
    {/* status-gated action buttons */}
  </div>

  {/* Bento grid */}
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

    {/* LEFT — main content (8/12 = 67%) */}
    <div className="lg:col-span-8 space-y-6">
      <Card>/* Header card: code + title + status badge + field grid */</Card>
      <Card>/* Domain-specific spec card */</Card>
      <Card>/* Review / assessment (conditional) */</Card>
      <Card className="border-destructive/40">/* Reject reason (terminal only) */</Card>
      <CommentsPanel />   {/* Always last in left column */}
    </div>

    {/* RIGHT — sidebar (4/12 = 33%) */}
    <div className="lg:col-span-4 space-y-6">
      <Card>/* Timeline / approval trace */</Card>
      <Card>/* Fill tracking (conditional) */</Card>
      <Card>/* Routing (conditional) */</Card>
      <AttachmentsPanel />
    </div>

  </div>

</div>
```

**Column split rationale:**
- 8/12 left (main): entity info, long-form content, comments
- 4/12 right (sidebar): contextual meta — timeline, links, attachments
- Both columns stack vertically on mobile (`grid-cols-1`)
- The left column renders first in DOM → appears at top on mobile (correct order)

**Detail page card ordering (left column):**
1. Header card (identity: code, title, status, key fields)
2. Domain spec card (conditional — only if spec exists)
3. Review/assessment card (conditional — only if data exists)
4. Reject/cancel reason cards (terminal state only)
5. CommentsPanel (always last)

---

### 4.3 Dashboard / Overview Page

```tsx
<div className="space-y-6">
  <PageHeader title="Finance Dashboard" subtitle="Costing overview" />

  {/* KPI row */}
  <KpiGrid cols={4}>
    <KpiCard title="Active Products" value={stats.active} icon={Package} loading={isLoading} />
    <KpiCard title="Requests" value={stats.requests} icon={FileText} href="/finance/product-requests" loading={isLoading} />
    <KpiCard title="Pending Review" value={stats.pending} variant="warning" icon={Clock} loading={isLoading} />
    <KpiCard title="Failed Jobs" value={stats.failed} variant="destructive" icon={AlertCircle} loading={isLoading} />
  </KpiGrid>

  {/* Secondary grid — charts or recent activity */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <Card>/* Chart or recent items */</Card>
    <Card>/* Another chart or stat */</Card>
  </div>

  {/* Full-width table or recent list */}
  <Card>
    <CardHeader>
      <CardTitle className="text-sm font-semibold">Recent requests</CardTitle>
    </CardHeader>
    <CardContent>
      <DataTable ... />
    </CardContent>
  </Card>
</div>
```

---

### 4.4 Form-Heavy Page (Wizard / Config)

```tsx
<div className="space-y-6">
  <PageHeader title="Fill Configuration" subtitle="Set global parameter fill rules" />

  {/* Single card with internal sections */}
  <Card>
    <CardHeader>
      <CardTitle className="text-sm font-semibold">Global settings</CardTitle>
      <CardDescription>Changes apply to all new requests.</CardDescription>
    </CardHeader>
    <CardContent>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Section */}
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Section A</div>
            {/* fields */}
          </div>
          <Separator />
          <div className="space-y-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Section B</div>
            {/* fields */}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={handleCancel}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </form>
      </Form>
    </CardContent>
  </Card>
</div>
```

---

## 5. Card Grid Layouts

### Responsive Grid Classes

```tsx
// 2 cards — always side by side except mobile
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">

// 3 cards
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// 4 KPI cards
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">  {/* 2 per row on mobile */}

// Auto-fill (responsive card grid)
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

// Field grid inside a card (not cards themselves)
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
```

### When to Use Which Grid

| Count | Mobile | Desktop | Code |
|-------|--------|---------|------|
| 2 cards | 1 col | 2 col | `grid-cols-1 md:grid-cols-2` |
| 3 cards | 1 col | 3 col | `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` |
| 4 KPI | 2 col | 4 col | `grid-cols-2 md:grid-cols-4` |
| Detail bento | 1 col | 8+4 col | `grid-cols-1 lg:grid-cols-12` |
| Fields inside card | 2 col | 4 col | `grid grid-cols-2 md:grid-cols-4 gap-4` |

---

## 6. Table Responsiveness

Tables with many columns are the #1 source of horizontal overflow issues. Follow these rules:

### Column Visibility Strategy

**Always use `hideOnMobile: true`** on secondary columns:
```tsx
{
  id: "description",
  header: "Description",
  hideOnMobile: true,  // hidden on screens < md (768px)
  cellClassName: "text-muted-foreground max-w-[200px] truncate",
  accessorKey: "description",
},
{
  id: "createdAt",
  header: "Created",
  hideOnMobile: true,
  cell: (row) => <span className="text-xs">{row.createdAt}</span>,
},
```

**Priority for `hideOnMobile`:**
1. Always visible: Name/Title (primary identifier), Status, Actions
2. Hidden on mobile: Description, timestamps, secondary codes, parent references
3. Optional (show/hide via column menu): IDs, technical metadata

### Sticky Columns for Wide Tables

For tables with 6+ columns, pin the identifier and actions:
```tsx
{
  id: "code",
  header: "Code",
  widthPx: 120,          // Required for sticky offset calculation
  sticky: "left",
  cell: (row) => <span className="font-mono">{row.code}</span>,
},
```

Plus `stickyActions` on the `<DataTable>` — pins the Actions column to the right.

### Column Width Guidelines

| Column type | Width |
|-------------|-------|
| Short code (3–6 chars) | `w-[80px]` or `widthPx: 80` |
| Standard code (up to 10 chars) | `w-[120px]` |
| Status badge | `w-[120px]` |
| Short date | `w-[100px]` |
| Date + time | `w-[160px]` |
| Number / metric | `w-[80px]` to `w-[100px]` |
| Action buttons (2 icons) | Auto via `stickyActions` |
| Name / title (primary) | No width — let it flex |

---

## 7. Dialog & Drawer Responsive

### Dialog

- All dialogs are `sm:max-w-[Npx]` — full-width on mobile (`<640px`), capped on desktop
- Minimum: `sm:max-w-[400px]` — even simple dialogs should have a desktop max-width
- Maximum: `sm:max-w-[720px]` — beyond this, consider a Drawer (Sheet) instead

```tsx
// Mobile: full width (100vw - 2rem padding)
// Desktop: max 480px, centered
<DialogContent className="sm:max-w-[480px]">
```

### Drawer / Sheet

- `w-full sm:max-w-2xl` — full-width on mobile, 672px cap on desktop
- Never fixed-width drawers — always `w-full` + `sm:max-width`
- Drawer always slides from `side="right"` for secondary panels
- Only use `side="bottom"` for mobile-primary filter panels (rare)

```tsx
<SheetContent side="right" className="flex flex-col p-0 w-full sm:max-w-2xl gap-0">
```

---

## 8. Mobile Rules

### Button Layout on Mobile

Action bars always use `flex-wrap`:
```tsx
<div className="flex flex-wrap items-center gap-2">
  <Button>Submit</Button>
  <Button variant="outline">Edit</Button>
  {/* flex-1 spacer to push trailing buttons right — collapses on wrap */}
  <div className="flex-1" />
  <Button variant="ghost">Cancel</Button>
</div>
```

On mobile (`<640px`), when the container is narrower, buttons wrap to the next line. The `flex-1` spacer collapses and the "Cancel" button appears below the primary actions — this is correct behavior.

### Header Actions Collapse to Icon-Only

Below `sm` (640px), buttons in the `PageHeader` actions slot collapse to **icon-only**: wrap the label in `<span className="hidden sm:inline">`, keep the icon always visible, and add `aria-label` on the button so icon-only remains accessible. Dropdown chevrons may stay visible. Full pattern in DESIGN.md §5.3 (Header Action Buttons); reference: `/finance/product-master` (Import / Export / New product).

### 375px Responsive Floor

Every list page must be verified at **375px** viewport width:

- Zero horizontal page overflow (header and sidebar never scroll sideways)
- Filter controls stack (`grid-cols-1` / `flex-col` at base)
- Tables scroll **inside their own wrapper only** — never the page

### PageHeader on Mobile

The `PageHeader` component handles this automatically:
```tsx
// Mobile: title/subtitle stacked, buttons below
// Desktop (md:): title left, buttons right
className="flex flex-col gap-4 pb-6 md:flex-row md:items-center md:justify-between"
```

On mobile, children (buttons) appear below the title. They should be a `flex flex-wrap gap-2` row, not a `flex-col` stack.

### Typography on Mobile

- Page title: `text-lg md:text-xl` (smaller on mobile)
- Do not hide the page title or subtitle on mobile
- Card titles (`text-sm font-semibold`) — same size on all breakpoints

### Touch Targets

Minimum touch target: **44×44px** (Apple/Google guideline).

```tsx
// ✓ Correct — h-9 w-9 = 36px (close enough, matches shadcn defaults)
<Button size="icon" className="h-9 w-9">

// ✓ Acceptable — shadcn Button default is h-9 = 36px
<Button>Submit</Button>

// ✗ Too small — avoid custom sm buttons in primary actions
<Button size="sm" className="h-7">  {/* 28px — too small for mobile tap */}
```

For table row actions on mobile, they collapse to a `MoreHorizontal` dropdown — the trigger button is full size.

### Form on Mobile

- Form fields should be full-width on mobile
- Multi-column form grids: `grid-cols-1 sm:grid-cols-2`
- Never `grid-cols-2` without `sm:` prefix — 2-column forms are too narrow on mobile
- `DialogContent` is full-width on mobile automatically

---

## 9. Sticky Elements

### Sticky Page Header

Already implemented in `(dashboard)/layout.tsx`:
```tsx
<header className="sticky top-0 z-50 ...">
```

**Do not add more sticky headers within a page.** If a card needs a sticky toolbar (e.g., filter bar), use:
```tsx
<div className="sticky top-16 z-40 bg-background border-b py-2 px-4">
  {/* filters */}
</div>
```
(`top-16` = 4rem = 64px = height of the page header)

### Sticky Drawer Header + Footer

See §5.11 (Drawer). The key pattern:
```tsx
<SheetContent className="flex flex-col p-0 ...">
  {/* Sticky header */}
  <div className="shrink-0 border-b bg-background px-6 py-4">...</div>

  {/* Scrollable body */}
  <div className="flex-1 overflow-y-auto px-6 py-5">...</div>

  {/* Sticky footer */}
  <div className="shrink-0 border-t bg-background px-6 py-4">...</div>
</SheetContent>
```

`shrink-0` + `bg-background` are both mandatory — `shrink-0` prevents flex compression, `bg-background` prevents content bleed-through when scrolling.

### Sticky Table Header

The `DataTable` component automatically sets `bg-background` on `TableHeader`:
```tsx
<TableHeader className="bg-background">
  <TableRow className="bg-background hover:bg-background">
```

For tables inside cards, sticky header is handled automatically.

#### Custom table with sticky header + horizontal scroll

When building a custom table (not `DataTable`) that needs BOTH sticky vertical header and horizontal scroll, the shadcn `<Table>` component **cannot** be used — it wraps `<table>` in `<div className="relative w-full overflow-x-auto">` which creates a scroll container that breaks `position: sticky`.

**Use a raw `<table>` element inside a bounded scroll container:**

```tsx
<div className="rounded-md border overflow-hidden">
  {/* Single container handles both axes */}
  <div className="overflow-x-auto overflow-y-auto max-h-[540px]">
    {/* Raw <table> — NOT the shadcn <Table> component */}
    <table className="w-full caption-bottom text-sm">
      {/* sticky top-0 pins thead to the TOP of THIS 540px container */}
      <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_0_hsl(var(--border))]">
        <TableRow>
          <TableHead>Column A</TableHead>
          <TableHead>Column B</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>...</TableBody>
    </table>
  </div>
</div>
```

**Why this works:**
- `overflow-x-auto overflow-y-auto max-h-[Npx]` creates ONE scroll container for both axes
- `sticky top-0` pins the thead inside that 540px container (not the viewport)
- The layout's `overflow-x-hidden` prevents the container itself from widening the page
- The `shadow-[0_1px_0_0_hsl(var(--border))]` replaces the border (which doesn't stick with the header)

**Why shadcn `<Table>` breaks sticky:**
The `<Table>` component adds `<div className="relative w-full overflow-x-auto">` around `<table>`. This makes the div the scroll container, not the outer wrapper. Sticky elements inside an `overflow-x-auto` container have no Y scroll to stick within — they just scroll away.

---

## 10. Common Responsive Bugs & Fixes

### Bug: Entire page scrolls horizontally (header + sidebar included)

**Cause**: Missing `min-w-0` on a flex container in the main layout path.

**Fix**: Ensure `min-w-0` is present on:
- `SidebarInset` wrapper div
- The `<main>` element
- Any intermediate `flex` or `grid` container that holds the page content

```tsx
// In layout.tsx
<div className="flex flex-1 flex-col gap-4 p-4 pt-0 min-w-0">  {/* ← min-w-0 */}
  <main className="flex-1 pt-4 min-w-0 w-full">                 {/* ← min-w-0 */}
    {children}
  </main>
</div>
```

---

### Bug: Table overflows the card and pushes page width

**Cause**: Table (or `<DataTable>`) is not wrapped in `overflow-x-auto`.

**Fix**: The `DataTable` component already wraps the `<Table>` in `<div className="w-full min-w-0 max-w-full">`. If you're using a custom `<Table>` (not `<DataTable>`), always wrap it:

```tsx
<CardContent>
  <div className="w-full overflow-x-auto">
    <Table>...</Table>
  </div>
</CardContent>
```

---

### Bug: Buttons in action bar overlap on mobile

**Cause**: Missing `flex-wrap` on the action bar container.

**Fix**:
```tsx
{/* ✓ Correct */}
<div className="flex flex-wrap items-center gap-2">

{/* ✗ Wrong */}
<div className="flex items-center gap-2">  {/* no wrap → buttons overlap */}
```

---

### Bug: Button overlaps PageHeader title on mobile

**Cause**: PageHeader children (`flex items-center gap-2`) is inside the same `flex-row` as the title on mobile.

**Fix**: The `PageHeader` component uses `flex-col md:flex-row` — do NOT override this. The children div (`flex items-center gap-2`) will appear below the title on mobile and to the right on desktop. This is correct.

If you have more than 2 buttons in PageHeader children, add `flex-wrap`:
```tsx
<PageHeader title="...">
  <div className="flex flex-wrap gap-2">   {/* wrap for multiple buttons */}
    <Button variant="outline">Export</Button>
    <Button variant="outline">Import</Button>
    <Button>Add New</Button>
  </div>
</PageHeader>
```

---

### Bug: Modal / dialog scrolls the whole page instead of modal content

**Cause**: Form content inside dialog is too tall and the dialog doesn't have internal scroll.

**Fix**: Switch from `<DialogContent>` to `<ScrollableDialogContent>` (for 6+ fields). See DESIGN.md §5.9.

---

### Bug: Drawer footer not visible — content pushes it off-screen

**Cause**: Drawer body has `overflow-y-auto` but no `flex-1`, or the body is not `flex-1`, so it expands past the viewport.

**Fix**:
```tsx
<SheetContent className="flex flex-col p-0 ...">
  <div className="shrink-0 ...">header</div>       {/* shrink-0: never compress */}
  <div className="flex-1 overflow-y-auto ...">body</div>  {/* flex-1: takes remaining space, then scroll */}
  <div className="shrink-0 ...">footer</div>       {/* shrink-0: never compress */}
</SheetContent>
```

---

### Bug: Sticky table header is transparent — content shows through

**Cause**: `TableHeader` rows don't have `bg-background`.

**Fix** (already in DataTable, apply to custom tables):
```tsx
<TableHeader>
  <TableRow className="bg-background hover:bg-background">
    {/* ... */}
  </TableRow>
</TableHeader>
```

---

### Bug: Sticky thead scrolls away on a custom table (not DataTable)

**Cause**: Using the shadcn `<Table>` component with an outer `overflow-x-auto` wrapper. The `<Table>` component wraps `<table>` in `<div className="relative w-full overflow-x-auto">` — this inner div becomes the scroll container, so `sticky` has nowhere to stick in the Y direction.

Also caused by using `overflow-x-hidden` on a wrapping container — `overflow-x-hidden` forces `overflow-y: auto` (CSS spec), making that container the scroll container. The `sticky top-0` inside it sticks to that container rather than the viewport.

**Fix**: Use a raw `<table>` element inside a single `overflow-x-auto overflow-y-auto max-h-[Npx]` container. See §9 (Sticky Table Header — custom table pattern).

---

### Bug: Card title is dim / looks secondary

**Cause**: Using `typography.cardTitle` from `typography.ts` (old value: `text-sm font-medium text-muted-foreground`).

**Fix**: Always use `className="text-sm font-semibold"` on `CardTitle`. Update `typography.ts` to fix the definition:
```ts
cardTitle: "text-sm font-semibold",  // NOT text-muted-foreground
```

---

### Bug: On wide tables, the action column "floats" away from the data

**Cause**: `stickyActions` not set on the `DataTable`.

**Fix**: Add `stickyActions` to any table with 4+ columns:
```tsx
<DataTable ... stickyActions />
```

---

### Bug: Filter selects wrap differently on different pages

**Cause**: Inconsistent filter bar markup (some use `flex-row`, some `flex-wrap`, different gap values).

**Fix**: Always use:
```tsx
<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
  <DebouncedSearchInput ... className="flex-1 sm:max-w-sm" />
  <div className="flex flex-wrap items-center gap-2">
    {/* selects, sort, clear */}
  </div>
</div>
```

This stacks on mobile (search above, dropdowns below), inline from 640px (search left, dropdowns right).
