import { ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface PageHeaderProps {
    title: string
    subtitle?: string
    children?: ReactNode
    /** Extra classes for the header wrapper (e.g. "pb-0" to keep a page's space-y rhythm uniform). */
    className?: string
}

export function PageHeader({ title, subtitle, children, className }: PageHeaderProps) {
    return (
        <div className={cn("flex flex-col gap-2 pb-2 md:flex-row md:items-center md:justify-between", className)}>
            <div className="space-y-1">
                <h1 className="text-lg font-bold tracking-tight md:text-xl">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-muted-foreground text-sm">{subtitle}</p>
                )}
            </div>
            {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
        </div>
    )
}
