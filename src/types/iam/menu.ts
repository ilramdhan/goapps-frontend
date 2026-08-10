// Menu types — normalized from proto iam/v1/menu.proto
// Handles both camelCase (proto JSON) and snake_case (raw gRPC)

import type { LucideIcon } from "lucide-react"
import type { NavGroup, MenuItem } from "@/config/navigation"

// MenuLevel mirrors proto enum MenuLevel
export enum MenuLevel {
    UNSPECIFIED = 0,
    ROOT = 1,
    PARENT = 2,
    CHILD = 3,
}

// Raw response shape from proto/BFF (may be camelCase or snake_case)
export interface RawMenu {
    menuId?: string
    menu_id?: string
    parentId?: string | null
    parent_id?: string | null
    menuCode?: string
    menu_code?: string
    menuTitle?: string
    menu_title?: string
    menuUrl?: string | null
    menu_url?: string | null
    iconName?: string
    icon_name?: string
    serviceName?: string
    service_name?: string
    menuLevel?: MenuLevel | number
    menu_level?: MenuLevel | number
    sortOrder?: number
    sort_order?: number
    isVisible?: boolean
    is_visible?: boolean
    isActive?: boolean
    is_active?: boolean
}

export interface RawMenuWithChildren extends RawMenu {
    menu?: RawMenu
    children?: RawMenuWithChildren[]
    requiredPermissions?: string[]
    required_permissions?: string[]
}

// Normalized, consistent shape used throughout the application
export interface NormalizedMenu {
    menuId: string
    parentId: string | null
    menuCode: string
    menuTitle: string
    menuUrl: string | null
    iconName: string
    serviceName: string
    menuLevel: number
    sortOrder: number
    isVisible: boolean
    isActive: boolean
}

export interface NormalizedMenuWithChildren extends NormalizedMenu {
    children: NormalizedMenuWithChildren[]
    requiredPermissions: string[]
}

// Pagination types for list response
export interface MenuListResponse {
    data: NormalizedMenu[]
    pagination: {
        currentPage: number
        pageSize: number
        totalItems: string | number
        totalPages: number
    }
}

export interface MenuTreeResponse {
    data: NormalizedMenuWithChildren[]
}

// Request types
export interface CreateMenuData {
    parentId?: string | null
    menuCode: string
    menuTitle: string
    menuUrl?: string | null
    iconName: string
    serviceName: string
    menuLevel: MenuLevel
    sortOrder?: number
    isVisible?: boolean
    permissionIds?: string[]
}

export interface UpdateMenuData {
    menuTitle?: string
    menuUrl?: string | null
    iconName?: string
    sortOrder?: number
    isVisible?: boolean
    isActive?: boolean
}

export interface ListMenusParams {
    page: number
    pageSize: number
    search?: string
    serviceName?: string
    sortBy?: string
    sortOrder?: string
    isVisible?: boolean
    menuLevel?: MenuLevel
}

// =============================================================================
// Normalizer functions
// =============================================================================

export function normalizeMenu(raw: RawMenu | RawMenuWithChildren): NormalizedMenu {
    // Handle proto wrapper where menu data is nested under 'menu' field
    const src = ("menu" in raw && raw.menu) ? raw.menu : raw
    return {
        menuId:      src.menuId      ?? src.menu_id      ?? "",
        parentId:    src.parentId    ?? src.parent_id    ?? null,
        menuCode:    src.menuCode    ?? src.menu_code    ?? "",
        menuTitle:   src.menuTitle   ?? src.menu_title   ?? "",
        menuUrl:     src.menuUrl     ?? src.menu_url     ?? null,
        iconName:    src.iconName    ?? src.icon_name    ?? "",
        serviceName: src.serviceName ?? src.service_name ?? "",
        menuLevel:   Number(src.menuLevel  ?? src.menu_level  ?? 0),
        sortOrder:   Number(src.sortOrder  ?? src.sort_order  ?? 0),
        isVisible:   src.isVisible   ?? src.is_visible   ?? true,
        isActive:    src.isActive    ?? src.is_active    ?? true,
    }
}

export function normalizeMenuWithChildren(raw: RawMenuWithChildren): NormalizedMenuWithChildren {
    const base = normalizeMenu(raw)
    const children = Array.isArray(raw.children)
        ? raw.children.map(normalizeMenuWithChildren)
        : []
    const requiredPermissions =
        raw.requiredPermissions ??
        raw.required_permissions ??
        []
    return { ...base, children, requiredPermissions }
}

export function normalizeMenuTree(raw: RawMenuWithChildren[]): NormalizedMenuWithChildren[] {
    if (!Array.isArray(raw)) return []
    return raw.map(normalizeMenuWithChildren)
}

// =============================================================================
// Icon resolver — maps DB icon name string (PascalCase) → Lucide component
// Uses lucide-react's dynamic import map so ALL ~1900 icons are supported,
// not just a hand-picked whitelist.
// =============================================================================

import { dynamicIconImports, type IconName } from "lucide-react/dynamic"

/**
 * Map every dynamicIconImports kebab-case key (e.g. "clipboard-list",
 * "bar-chart-3", "x-circle", "grid-2x2") to its DB-stored PascalCase name
 * (e.g. "ClipboardList", "BarChart3", "XCircle", "Grid2x2").
 *
 * Built kebab -> Pascal (not the reverse) because that direction is exact —
 * a regex-based Pascal -> kebab converter can't round-trip acronym runs
 * ("XCircle" has no case-boundary hyphen: "xcircle") or digit-only groups
 * ("Grid2x2" -> "grid2x2", not "grid-2x-2"), and multiple kebab names can
 * collapse onto the same guessed Pascal name (e.g. "arrow-down-0-1" and
 * "arrow-down-01" both naively become "ArrowDown01").
 */
const kebabToPascal = (kebab: string): string =>
    kebab
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("")

const PASCAL_TO_ICON_NAME: Record<string, IconName> = {}
for (const kebab of Object.keys(dynamicIconImports) as IconName[]) {
    const pascal = kebabToPascal(kebab)
    if (!(pascal in PASCAL_TO_ICON_NAME)) {
        PASCAL_TO_ICON_NAME[pascal] = kebab
    }
}

/**
 * Resolve a DB-stored (PascalCase) icon name to a valid dynamicIconImports
 * key, or undefined if it doesn't match any known Lucide icon.
 */
export function pascalToIconName(name: string): IconName | undefined {
    return PASCAL_TO_ICON_NAME[name]
}

/** All valid icon names, in PascalCase, for use in search/picker UIs. */
export const pascalCaseIconNames: string[] = Object.keys(PASCAL_TO_ICON_NAME)

// Synchronous icon cache populated after first async resolution
const _iconCache: Record<string, LucideIcon> = {}

/**
 * Synchronously return a resolved icon (if already loaded) or undefined.
 * Components using this should call `preloadMenuIcons()` on mount.
 */
export function resolveIcon(iconName: string): LucideIcon | undefined {
    return _iconCache[iconName]
}

/**
 * Preload all icons referenced in a menu tree into the synchronous cache.
 * Call this once after fetching the menu tree.
 */
export async function preloadMenuIcons(items: NormalizedMenuWithChildren[]): Promise<void> {
    const names = new Set<string>()
    function collect(nodes: NormalizedMenuWithChildren[]) {
        for (const n of nodes) {
            if (n.iconName) names.add(n.iconName)
            if (n.children.length) collect(n.children)
        }
    }
    collect(items)

    await Promise.all(
        Array.from(names).map(async (name) => {
            if (_iconCache[name]) return
            const iconName = pascalToIconName(name)
            if (!iconName) return
            const mod = await dynamicIconImports[iconName]()
            _iconCache[name] = mod.default
        })
    )
}

// =============================================================================
// Converter: NormalizedMenuWithChildren[] → NavGroup[] (for AppSidebar)
// Proto menu level 1 = ROOT (sidebar group), level 2 = PARENT, level 3 = CHILD
// =============================================================================

function menuToMenuItem(menu: NormalizedMenuWithChildren): MenuItem {
    return {
        id:       menu.menuId,
        title:    menu.menuTitle,
        url:      menu.menuUrl ?? undefined,
        icon:     resolveIcon(menu.iconName),
        iconName: menu.iconName,
        order:    menu.sortOrder,
        isVisible: menu.isVisible,
        children:  menu.children.length > 0
            ? menu.children.map(menuToMenuItem)
            : undefined,
    }
}

/**
 * Convert a list of ROOT-level menus returned by GetMenuTree into NavGroup[].
 * Each ROOT menu becomes one NavGroup; its PARENT children become NavGroup items.
 * ROOT menus that are direct links (have a URL but no children) are rendered as
 * a single-item NavGroup containing the root menu itself.
 */
export function menuTreeToNavGroups(roots: NormalizedMenuWithChildren[]): NavGroup[] {
    return roots
        .filter((r) => r.isVisible)
        .map((root) => {
            const visibleChildren = root.children.filter((c) => c.isVisible)
            if (visibleChildren.length > 0) {
                // Convert children, but skip any parent-group items that have no URL
                // and no children of their own (e.g. RM Pricing or Product Costing
                // parent menus whose children were all filtered by permissions).
                // Rendering a null-URL / no-children item causes broken navigation
                // and a "Dashboard not found" error in the BI viewer.
                const items = visibleChildren
                    .map(menuToMenuItem)
                    .filter((item) => item.url || (item.children && item.children.length > 0))
                if (items.length > 0) {
                    return { title: root.menuTitle, items }
                }
            }
            // ROOT leaf (has URL, no visible children) — render as single-item group
            if (root.menuUrl) {
                return {
                    title: root.menuTitle,
                    items: [menuToMenuItem(root)],
                }
            }
            return { title: root.menuTitle, items: [] }
        })
        .filter((g) => g.items.length > 0)
}
