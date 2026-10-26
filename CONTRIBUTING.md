# Contributing to goapps-frontend

Thank you for your interest in contributing to `goapps-frontend`! This document contains guidelines for contributing to the frontend application.

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Development Environment](#development-environment)
3. [Contribution Workflow](#contribution-workflow)
4. [Pull Request Guidelines](#pull-request-guidelines)
5. [Code Review Process](#code-review-process)
6. [Testing Requirements](#testing-requirements)
7. [Documentation Standards](#documentation-standards)
8. [Adding Components](#adding-components)
9. [Adding Pages](#adding-pages)
10. [Getting Help](#getting-help)

---

## Getting Started

### Prerequisites

- **Node.js 20+** - [Download](https://nodejs.org/)
- **npm** - Package manager
- **Git** - Version control
- **VSCode** - Recommended editor

### Install Tools

```bash
# Verify Node.js version
node --version  # Should be 20+

# Install dependencies
npm install
```

### Clone Repository

GoApps uses a **fork + upstream** model: `origin` is your fork (you push here), `upstream` is `mutugading/goapps-frontend` (fetch only, changes go in through PRs). The full guide is in [Git Workflow](https://github.com/mutugading/goapps-workspace/blob/main/docs/GIT-WORKFLOW.md).

Recommended: set up all four repos at once with the workspace tool:

```bash
git clone https://github.com/mutugading/goapps-workspace.git
cd goapps-workspace
make setup        # forks, clones and adds the upstream remote for every repo
```

Working on this repo only: fork it on GitHub, then

```bash
git clone https://github.com/<your-user>/goapps-frontend.git
cd goapps-frontend
git remote add upstream https://github.com/mutugading/goapps-frontend.git
git remote set-url --push upstream DISABLED   # never push to the org directly
```

### VSCode Extensions

Recommended extensions:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "formulahendry.auto-rename-tag"
  ]
}
```

---

## Development Environment

### Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Create `.env.local` for local development:

```bash
# Backend Services
COSTING_SERVICE_HOST=localhost
COSTING_SERVICE_PORT=50051
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Contribution Workflow

### 1. Create Issue (Recommended)

For major changes, create an issue first using available templates:

| Template | Usage |
|----------|-------|
| [🐛 Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) | Report bugs |
| [✨ Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) | Request features |
| [📱 UI/UX Improvement](.github/ISSUE_TEMPLATE/ui_improvement.md) | Suggest UI changes |

### 2. Create Feature Branch

Never work on `main`; it only mirrors `upstream/main`. Always branch from the latest `upstream/main`:

```bash
# From goapps-workspace (add REPOS=... to span several repos with the same branch name)
make feat NAME=finance-dashboard REPOS=frontend

# Or manually in this repo
git fetch upstream
git switch -c feat/finance-dashboard upstream/main

# Other examples:
#   fix/sidebar-collapse
#   refactor/chart-components
```

Branch types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `ci`.

### 3. Make Changes

```bash
# 1. Write code following RULES.md

# 2. Check for lint errors
npm run lint

# 3. Check for type errors
npx tsc --noEmit

# 4. Build to verify
npm run build
```

### 4. Commit and Push

```bash
git add .
git commit -m "feat(finance): add UOM table component"
git push origin <branch-name>
```

### 5. Create Pull Request

Create PR via GitHub UI using the PR template.

Shortcut from goapps-workspace: `make push && make pr` opens the PR form for every repo whose branch has new commits.

> **Keeping up to date**: rebase on the latest org code with `make update` (or `git fetch upstream && git rebase upstream/main`), then `git push --force-with-lease`. After your PR is merged, run `make sync && make cleanup` from goapps-workspace. Do **not** use GitHub's "Sync fork → Update branch" on `main` after a squash merge; it creates duplicate commits. Conflicts and other edge cases: see [Git Workflow](https://github.com/mutugading/goapps-workspace/blob/main/docs/GIT-WORKFLOW.md#6-konflik-dan-kasus-yang-sering-terjadi).

---

## Pull Request Guidelines

### PR Requirements

| Requirement | Description |
|-------------|-------------|
| **CI Passing** | Lint, type check, build pass |
| **Review Approval** | 1 maintainer approval |
| **No Conflicts** | Up-to-date with main |
| **Screenshots** | Include for UI changes |

### Labels

| Label | Description |
|-------|-------------|
| `type: feature` | New feature |
| `type: bug` | Bug fix |
| `type: ui` | UI/UX changes |
| `module: finance` | Finance module |
| `module: hr` | HR module |
| `component: sidebar` | Sidebar component |

---

## Code Review Process

### Review Checklist

**For Reviewers:**

- [ ] Follows RULES.md guidelines
- [ ] Component structure correct
- [ ] Loading states implemented
- [ ] Responsive design tested
- [ ] Dark mode compatible
- [ ] TypeScript types proper
- [ ] No unnecessary re-renders

### Review SLA

| PR Type | SLA |
|---------|-----|
| Bug fix | 24 hours |
| Feature | 48 hours |
| Large refactor | 1 week |

---

## Testing Requirements

### Before Submitting PR

```bash
# 1. Lint check
npm run lint

# 2. Type check
npx tsc --noEmit

# 3. Build check
npm run build

# 4. Manual testing
npm run dev
```

### Manual Testing Checklist

- [ ] Desktop (1440px+)
- [ ] Tablet (768px)
- [ ] Mobile (375px)
- [ ] Light mode
- [ ] Dark mode
- [ ] Keyboard navigation

---

## Documentation Standards

### When to Update Docs

- ✅ Adding new components
- ✅ Adding new pages
- ✅ Changing navigation
- ✅ Changing API integration
- ✅ Breaking changes

### Component Documentation

```tsx
/**
 * PageHeader - Standard page header with title and actions
 * 
 * @example
 * <PageHeader title="Dashboard" subtitle="Overview">
 *   <Button>Action</Button>
 * </PageHeader>
 */
export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  // ...
}
```

---

## Adding Components

### 1. Create Component

```bash
# Location: src/components/common/my-component.tsx
```

```tsx
"use client" // Only if needed

import { cn } from "@/lib/utils"

export interface MyComponentProps {
  title: string
  className?: string
}

export function MyComponent({ title, className }: MyComponentProps) {
  return (
    <div className={cn("base-styles", className)}>
      {title}
    </div>
  )
}
```

### 2. Export from Index

```tsx
// src/components/common/index.ts
export { MyComponent } from "./my-component"
```

### 3. Add shadcn/ui Component

```bash
npx shadcn@latest add [component-name]
```

> ⚠️ Never modify files in `components/ui/`

---

## Adding Pages

### 1. Create Page File

```bash
# Location: src/app/(dashboard)/[module]/[page]/page.tsx
```

```tsx
import { PageHeader } from "@/components/common"

export default function MyPage() {
  return (
    <div>
      <PageHeader title="Page Title" />
      {/* Content */}
    </div>
  )
}
```

### 2. Create Loading State

```tsx
// src/app/(dashboard)/[module]/[page]/loading.tsx
import { TableSkeleton } from "@/components/loading"

export default function Loading() {
  return <TableSkeleton />
}
```

### 3. Update Navigation

```tsx
// src/config/navigation.ts
{
  title: "New Page",
  url: "/module/page",
  icon: SomeIcon,
}
```

---

## Getting Help

### Channels

| Channel | Purpose |
|---------|---------|
| GitHub Issues | Bug reports, features |
| Slack #goapps-frontend | Quick questions |

### Before Asking

1. ✅ Search existing issues
2. ✅ Read documentation
3. ✅ Check RULES.md
4. ✅ Try debugging first

---

## Code of Conduct

- 🤝 Be respectful
- 💡 Give constructive feedback
- 📝 Document your changes
- ✅ Test before pushing
- 🙋 Ask if unsure

---

Thank you for contributing! 🚀
