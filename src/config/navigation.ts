import {
  LayoutDashboard,
  DollarSign,
  Settings,
  MonitorDot,
  Users,
  Ship,
  TrendingUp,
  Database,
  Receipt,
  Shield,
  type LucideIcon,
} from "lucide-react"

// =============================================================================
// Navigation Types - Prepared for future IAM integration
// =============================================================================

/**
 * Base menu item interface - prepared for dynamic menu from database
 * When IAM service is ready, this will be populated from API
 */
export interface MenuItem {
  /** Unique identifier (for database storage) */
  id: string
  /** Display title */
  title: string
  /** URL path (undefined for parent-only menus) */
  url?: string
  /** Lucide icon name (stored as string in DB, resolved at runtime) */
  icon?: LucideIcon
  /** Icon name as string (for DB storage) */
  iconName?: string
  /** Permission code for IAM (e.g., "finance.master.uom.view") */
  permission?: string
  /** Sort order */
  order: number
  /** Whether menu is visible */
  isVisible: boolean
  /** Child menu items */
  children?: MenuItem[]
}

/**
 * Navigation group (top-level sections in sidebar)
 */
export interface NavGroup {
  /** Group title (e.g., "Overview", "Modules") */
  title: string
  /** Menu items in this group */
  items: MenuItem[]
}

// =============================================================================
// Legacy Types - For backward compatibility with existing components
// =============================================================================

export interface NavSubItem {
  title: string
  url: string
  isActive?: boolean
}

export interface NavSubMenu {
  title: string
  url: string
  isActive?: boolean
  items?: NavSubItem[]
}

export interface NavItem {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  items?: NavSubMenu[]
}

// =============================================================================
// User Data - Now fetched dynamically via useCurrentUser hook
// See: src/hooks/iam/use-current-user.ts
// =============================================================================

// =============================================================================
// Breadcrumb Configuration
// Maps URL paths to breadcrumb display info
// =============================================================================

export interface BreadcrumbConfig {
  /** Display title in breadcrumb */
  title: string
  /** URL to navigate to (undefined = no link) */
  href?: string
}

/**
 * Breadcrumb mapping for custom titles and links
 * Key: URL path segment or full path
 * Value: Display configuration
 */
export const breadcrumbConfig: Record<string, BreadcrumbConfig> = {
  // Root
  "/": { title: "Home", href: "/dashboard" },
  "/dashboard": { title: "Home", href: "/dashboard" },

  // Finance module
  "/finance": { title: "Finance", href: "/finance/dashboard" },
  "/finance/dashboard": { title: "Finance", href: "/finance/dashboard" },
  "/finance/master": { title: "Master", href: undefined }, // No page, skip in breadcrumb
  "/finance/master/uom": { title: "Unit of Measure" },
  "/finance/master/parameters": { title: "Parameters" },
  "/finance/transaction": { title: "Transaction", href: undefined }, // No page, category only
  "/finance/transaction/costing-process": { title: "Costing Process" },
  "/finance/cost-results": { title: "Cost Results" },

  // Executive Dashboard (BI)
  "/finance/bi": { title: "Executive Dashboard", href: "/finance/bi" },
  "/finance/bi/admin": { title: "Admin Panel", href: "/finance/bi/admin" },
  "/finance/bi/admin/new": { title: "New Dashboard" },
  "/finance/bi/upload": { title: "Upload Data" },

  // IT module
  "/it": { title: "IT", href: "/it/dashboard" },
  "/it/dashboard": { title: "IT", href: "/it/dashboard" },

  // HR module
  "/hr": { title: "HR", href: "/hr/dashboard" },
  "/hr/dashboard": { title: "HR", href: "/hr/dashboard" },

  // CI module
  "/ci": { title: "CI", href: "/ci/dashboard" },
  "/ci/dashboard": { title: "CI", href: "/ci/dashboard" },

  // Export Import module
  "/exsim": { title: "Export Import", href: "/exsim/dashboard" },
  "/exsim/dashboard": { title: "Export Import", href: "/exsim/dashboard" },

  // Administrator (IAM management) — parent has no href (non-clickable in breadcrumb)
  "/administrator": { title: "Administrator" },
  "/administrator/users": { title: "User Management" },
  "/administrator/roles": { title: "Roles & Permissions" },
  "/administrator/permissions": { title: "Permission Management" },
  "/administrator/menus": { title: "Menu Management" },
  "/administrator/activity": { title: "Activity Log" },

  // Profile
  "/profile": { title: "Profile" },
}

// =============================================================================
// Navigation Structure
// Currently hardcoded, will be replaced by API data when IAM is ready
// =============================================================================

/**
 * Main navigation configuration
 * Structure: Group > Module > Category > Page
 */
export const navigation: NavGroup[] = [
  {
    title: "Overview",
    items: [
      {
        id: "dashboard",
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
        iconName: "LayoutDashboard",
        permission: "dashboard.view",
        order: 1,
        isVisible: true,
      },
    ],
  },
  {
    title: "Modules",
    items: [
      {
        id: "finance",
        title: "Finance",
        url: "/finance/dashboard",
        icon: DollarSign,
        iconName: "DollarSign",
        permission: "finance.view",
        order: 1,
        isVisible: true,
        children: [
          {
            id: "finance-dashboard",
            title: "Dashboard",
            url: "/finance/dashboard",
            permission: "finance.dashboard.view",
            order: 1,
            isVisible: true,
          },
          {
            id: "finance-master",
            title: "Master",
            icon: Database,
            iconName: "Database",
            permission: "finance.master.view",
            order: 2,
            isVisible: true,
            children: [
              {
                id: "finance-master-uom",
                title: "Unit of Measure",
                url: "/finance/master/uom",
                permission: "finance.master.uom.view",
                order: 1,
                isVisible: true,
              },
              {
                id: "finance-master-parameters",
                title: "Parameters",
                url: "/finance/master/parameters",
                permission: "finance.master.parameters.view",
                order: 2,
                isVisible: true,
              },
            ],
          },
          {
            id: "finance-transaction",
            title: "Transaction",
            icon: Receipt,
            iconName: "Receipt",
            permission: "finance.transaction.view",
            order: 3,
            isVisible: true,
            children: [
              {
                id: "finance-transaction-costing-process",
                title: "Costing Process",
                url: "/finance/transaction/costing-process",
                permission: "finance.transaction.costing-process.view",
                order: 1,
                isVisible: true,
              },
            ],
          },
        ],
      },
      {
        id: "it",
        title: "IT",
        url: "/it/dashboard",
        icon: MonitorDot,
        iconName: "MonitorDot",
        permission: "it.view",
        order: 2,
        isVisible: true,
        children: [
          {
            id: "it-dashboard",
            title: "Dashboard",
            url: "/it/dashboard",
            permission: "it.dashboard.view",
            order: 1,
            isVisible: true,
          },
        ],
      },
      {
        id: "hr",
        title: "HR",
        url: "/hr/dashboard",
        icon: Users,
        iconName: "Users",
        permission: "hr.view",
        order: 3,
        isVisible: true,
        children: [
          {
            id: "hr-dashboard",
            title: "Dashboard",
            url: "/hr/dashboard",
            permission: "hr.dashboard.view",
            order: 1,
            isVisible: true,
          },
        ],
      },
      {
        id: "exsim",
        title: "Export Import",
        url: "/exsim/dashboard",
        icon: Ship,
        iconName: "Ship",
        permission: "exsim.view",
        order: 4,
        isVisible: true,
        children: [
          {
            id: "exsim-dashboard",
            title: "Dashboard",
            url: "/exsim/dashboard",
            permission: "exsim.dashboard.view",
            order: 1,
            isVisible: true,
          },
        ],
      },
      {
        id: "ci",
        title: "CI",
        url: "/ci/dashboard",
        icon: TrendingUp,
        iconName: "TrendingUp",
        permission: "ci.view",
        order: 5,
        isVisible: true,
        children: [
          {
            id: "ci-dashboard",
            title: "Dashboard",
            url: "/ci/dashboard",
            permission: "ci.dashboard.view",
            order: 1,
            isVisible: true,
          },
        ],
      },
    ],
  },
  {
    title: "Administrator",
    items: [
      {
        id: "administrator",
        title: "Administrator",
        // No url — this is a parent-only container. Breadcrumb will render
        // "Administrator" as non-clickable plain text.
        icon: Settings,
        iconName: "Settings",
        permission: "iam.user.account.view",
        order: 1,
        isVisible: true,
        children: [
          {
            id: "administrator-users",
            title: "User Management",
            url: "/administrator/users",
            icon: Users,
            iconName: "Users",
            permission: "iam.user.account.view",
            order: 1,
            isVisible: true,
          },
          {
            id: "administrator-roles",
            title: "Roles & Permissions",
            url: "/administrator/roles",
            icon: Shield,
            iconName: "Shield",
            permission: "iam.rbac.role.view",
            order: 2,
            isVisible: true,
          },
          {
            id: "administrator-menus",
            title: "Menu Management",
            url: "/administrator/menus",
            icon: Settings,
            iconName: "Settings",
            permission: "iam.menu.menu.view",
            order: 3,
            isVisible: true,
          },
        ],
      },
    ],
  },
]

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Filter menu items by visibility and optionally by permissions
 */
export function filterVisibleMenus(
  items: MenuItem[],
  permissions?: Set<string>
): MenuItem[] {
  return items
    .filter((item) => {
      if (!item.isVisible) return false
      if (permissions && item.permission) {
        return permissions.has(item.permission)
      }
      return true
    })
    .map((item) => ({
      ...item,
      children: item.children
        ? filterVisibleMenus(item.children, permissions)
        : undefined,
    }))
    .filter((item) => {
      // Remove parent items that have no visible children and no URL
      if (!item.url && (!item.children || item.children.length === 0)) {
        return false
      }
      return true
    })
}

/**
 * Get filtered navigation with only visible items
 */
export function getVisibleNavigation(permissions?: Set<string>): NavGroup[] {
  return navigation
    .map((group) => ({
      ...group,
      items: filterVisibleMenus(group.items, permissions),
    }))
    .filter((group) => group.items.length > 0)
}

/**
 * Find menu item by URL path
 */
export function findMenuByPath(
  path: string,
  items: MenuItem[] = navigation.flatMap((g) => g.items)
): MenuItem | undefined {
  for (const item of items) {
    if (item.url === path) {
      return item
    }
    if (item.children) {
      const found = findMenuByPath(path, item.children)
      if (found) return found
    }
  }
  return undefined
}

/**
 * Check if a path is active (matches or is parent of current path)
 */
export function isPathActive(itemPath: string, currentPath: string): boolean {
  if (itemPath === currentPath) return true
  // Check if current path starts with item path (for parent menus)
  return currentPath.startsWith(itemPath + "/")
}

export interface BreadcrumbTrailItem {
  label: string
  href?: string
}

/**
 * Build breadcrumb trail by traversing the navigation tree for a target path.
 * Returns items from Home to the target page.
 * Categories (no url) render as plain text (href undefined).
 */
export function buildBreadcrumbTrail(
  targetPath: string
): BreadcrumbTrailItem[] | null {
  // Special case: home dashboard
  if (targetPath === "/dashboard") {
    return [{ label: "Home" }]
  }

  const trail: BreadcrumbTrailItem[] = []

  function search(items: MenuItem[], ancestors: BreadcrumbTrailItem[]): boolean {
    for (const item of items) {
      if (item.url === targetPath) {
        // Found the target — build trail
        trail.push({ label: "Home", href: "/dashboard" })
        trail.push(...ancestors)
        trail.push({ label: item.title }) // Last item, no href
        return true
      }

      if (item.children) {
        // For category items without url, render as plain text
        const ancestorItem: BreadcrumbTrailItem = {
          label: item.title,
          href: item.url, // undefined for categories
        }
        if (search(item.children, [...ancestors, ancestorItem])) {
          return true
        }
      }
    }
    return false
  }

  const allItems = navigation.flatMap((g) => g.items)
  if (search(allItems, [])) {
    return trail
  }
  return null
}
