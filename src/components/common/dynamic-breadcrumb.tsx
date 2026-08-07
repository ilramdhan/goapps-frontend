"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    Fragment,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useState,
} from "react"
import {
    Breadcrumb,
    BreadcrumbEllipsis,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbLink,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { buildBreadcrumbTrail, breadcrumbConfig } from "@/config/navigation"

export interface BreadcrumbItemType {
    label: string
    href?: string
}

// useLayoutEffect warns when it runs during SSR. Client components still get
// server-rendered, so fall back to useEffect on the server — the pre-paint
// guarantee only matters in the browser anyway.
const useIsomorphicLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect

// ------------------------------------------------------------
// Breadcrumb-tail override system
// ------------------------------------------------------------
// Detail pages (e.g. /finance/products/[id]) need to replace the trailing
// segment of the auto-generated breadcrumb (a UUID) with a human-readable
// label like a product code or ticket number. They register an override via
// `useBreadcrumbOverride(label)` inside the page; the layout-level
// <DynamicBreadcrumb /> consumes it.

interface BreadcrumbOverrideContextValue {
    tailLabel: string | null
    setTailLabel: (label: string | null) => void
    items: BreadcrumbItemType[] | null
    setItems: (items: BreadcrumbItemType[] | null) => void
}

const BreadcrumbOverrideContext = createContext<BreadcrumbOverrideContextValue | null>(
    null
)

export function BreadcrumbOverrideProvider({ children }: { children: React.ReactNode }) {
    const [tailLabel, setTailLabel] = useState<string | null>(null)
    const [items, setItems] = useState<BreadcrumbItemType[] | null>(null)
    const value = useMemo(
        () => ({
            tailLabel,
            setTailLabel,
            items,
            setItems,
        }),
        [tailLabel, items]
    )
    return (
        <BreadcrumbOverrideContext.Provider value={value}>
            {children}
        </BreadcrumbOverrideContext.Provider>
    )
}

/**
 * Replace the last breadcrumb item's label until this component unmounts or
 * `label` becomes null. Safe to call when the provider is missing — it is a
 * no-op in that case.
 */
export function useBreadcrumbOverride(label: string | null) {
    const ctx = useContext(BreadcrumbOverrideContext)
    const setTailLabel = useCallback(
        (l: string | null) => {
            ctx?.setTailLabel(l)
        },
        [ctx]
    )
    // Layout effect for the same reason as useBreadcrumbTrail below: useEffect
    // flushes after paint, so the raw trailing segment (a UUID or sys id) would
    // be visible for one frame before the label lands.
    useIsomorphicLayoutEffect(() => {
        if (!ctx) return
        ctx.setTailLabel(label)
        return () => {
            ctx.setTailLabel(null)
        }
        // We intentionally re-run when label changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [label])
    return setTailLabel
}

/**
 * Replace the ENTIRE breadcrumb trail until this component unmounts or `items`
 * becomes null. Use when the auto-derived trail is wrong beyond its tail — e.g.
 * multi-segment detail routes whose intermediate segments are route params that
 * would 404 if clicked. Pass `null` while the label data is still loading so the
 * raw path (ids/UUIDs) is never shown. No-op when the provider is missing.
 */
export function useBreadcrumbTrail(items: BreadcrumbItemType[] | null) {
    const ctx = useContext(BreadcrumbOverrideContext)
    // Identity-stable key so callers can pass an inline array literal without
    // triggering an update loop.
    const key = items ? JSON.stringify(items) : null
    // Layout effect, not effect: useEffect flushes AFTER paint, so the detail
    // page would paint one frame of the raw path — including the product sys id
    // — before the override lands. useLayoutEffect runs before the browser
    // paints, so the id is never visible.
    useIsomorphicLayoutEffect(() => {
        if (!ctx) return
        ctx.setItems(key ? (JSON.parse(key) as BreadcrumbItemType[]) : null)
        return () => {
            ctx.setItems(null)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])
}

interface DynamicBreadcrumbProps {
    items?: BreadcrumbItemType[]
    maxVisibleItems?: number
}

/**
 * Generate breadcrumbs from URL path using breadcrumbConfig as fallback
 */
function generateBreadcrumbsFromPath(pathname: string): BreadcrumbItemType[] {
    // Try navigation-aware trail first
    const navTrail = buildBreadcrumbTrail(pathname)
    if (navTrail) {
        return navTrail
    }

    // Fallback: build from URL segments using breadcrumbConfig
    const segments = pathname.split("/").filter(Boolean)

    if (segments.length === 0 || pathname === "/dashboard") {
        return [{ label: "Home" }]
    }

    // Pure UUID route params (e.g. /finance/bi/admin/{id}/edit) are not navigable on their
    // own and render as an unreadable hash that 404s when clicked. Drop them from the trail
    // unless they are the final segment (detail pages, whose tail label is overridden via
    // useBreadcrumbOverride and which render non-clickably as the current page anyway).
    const isUuid = (s: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

    const breadcrumbs: BreadcrumbItemType[] = []
    let currentPath = ""

    breadcrumbs.push({ label: "Home", href: "/dashboard" })

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]
        currentPath += `/${segment}`
        const isLast = i === segments.length - 1

        if (isUuid(segment) && !isLast) {
            continue
        }

        const config = breadcrumbConfig[currentPath]

        if (config) {
            breadcrumbs.push({
                label: config.title,
                href: isLast ? undefined : config.href,
            })
        } else {
            const label = segment
                .split("-")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")

            breadcrumbs.push({
                label,
                href: isLast ? undefined : currentPath,
            })
        }
    }

    return breadcrumbs
}

export function DynamicBreadcrumb({ items, maxVisibleItems = 4 }: DynamicBreadcrumbProps) {
    const pathname = usePathname()
    const overrideCtx = useContext(BreadcrumbOverrideContext)

    let breadcrumbs =
        items ?? overrideCtx?.items ?? generateBreadcrumbsFromPath(pathname)
    if (overrideCtx?.tailLabel && breadcrumbs.length > 0) {
        breadcrumbs = breadcrumbs.map((b, i) =>
            i === breadcrumbs.length - 1 ? { ...b, label: overrideCtx.tailLabel as string } : b
        )
    }

    if (breadcrumbs.length === 0) {
        return null
    }

    const shouldCollapse = breadcrumbs.length > maxVisibleItems

    if (!shouldCollapse) {
        return (
            <Breadcrumb>
                <BreadcrumbList>
                    {breadcrumbs.map((item, index) => {
                        const isLast = index === breadcrumbs.length - 1
                        return (
                            <Fragment key={item.label + index}>
                                <BreadcrumbItem className={!isLast ? "hidden md:block" : undefined}>
                                    {isLast ? (
                                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                                    ) : item.href ? (
                                        <BreadcrumbLink asChild>
                                            <Link href={item.href}>{item.label}</Link>
                                        </BreadcrumbLink>
                                    ) : (
                                        <span className="text-muted-foreground">{item.label}</span>
                                    )}
                                </BreadcrumbItem>
                                {!isLast && <BreadcrumbSeparator className="hidden md:block" />}
                            </Fragment>
                        )
                    })}
                </BreadcrumbList>
            </Breadcrumb>
        )
    }

    // Collapsed version: First > ... > Second-to-last > Last
    const firstItem = breadcrumbs[0]
    const lastItems = breadcrumbs.slice(-2)
    const collapsedItems = breadcrumbs.slice(1, -2)

    return (
        <Breadcrumb>
            <BreadcrumbList>
                {/* First item */}
                <BreadcrumbItem>
                    {firstItem.href ? (
                        <BreadcrumbLink asChild>
                            <Link href={firstItem.href}>{firstItem.label}</Link>
                        </BreadcrumbLink>
                    ) : (
                        <span className="text-muted-foreground">{firstItem.label}</span>
                    )}
                </BreadcrumbItem>
                <BreadcrumbSeparator />

                {/* Ellipsis with dropdown */}
                <BreadcrumbItem>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="size-6">
                                <BreadcrumbEllipsis />
                                <span className="sr-only">Toggle menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuGroup>
                                {collapsedItems.map((item) => (
                                    <DropdownMenuItem key={item.label} asChild={!!item.href}>
                                        {item.href ? (
                                            <Link href={item.href}>{item.label}</Link>
                                        ) : (
                                            <span>{item.label}</span>
                                        )}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </BreadcrumbItem>
                <BreadcrumbSeparator />

                {/* Last 2 items */}
                {lastItems.map((item, index) => {
                    const isLast = index === lastItems.length - 1
                    return (
                        <Fragment key={item.label}>
                            <BreadcrumbItem>
                                {isLast ? (
                                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                                ) : item.href ? (
                                    <BreadcrumbLink asChild>
                                        <Link href={item.href}>{item.label}</Link>
                                    </BreadcrumbLink>
                                ) : (
                                    <span className="text-muted-foreground">{item.label}</span>
                                )}
                            </BreadcrumbItem>
                            {!isLast && <BreadcrumbSeparator />}
                        </Fragment>
                    )
                })}
            </BreadcrumbList>
        </Breadcrumb>
    )
}
