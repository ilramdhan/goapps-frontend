"use client"

import { useState } from "react"
import {
    ChevronRight,
    ChevronDown,
    Pencil,
    Trash2,
    Shield,
    Plus,
    EyeOff,
} from "lucide-react"
import { DynamicIcon } from "lucide-react/dynamic"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { NormalizedMenuWithChildren } from "@/types/iam/menu"
import { MenuLevel, pascalToIconName } from "@/types/iam/menu"

interface MenuTreeViewProps {
    menus: NormalizedMenuWithChildren[]
    onEdit: (menu: NormalizedMenuWithChildren) => void
    onDelete: (menu: NormalizedMenuWithChildren) => void
    onAddChild: (parent: NormalizedMenuWithChildren) => void
    onManagePermissions: (menu: NormalizedMenuWithChildren) => void
}

export function MenuTreeView({
    menus,
    onEdit,
    onDelete,
    onAddChild,
    onManagePermissions,
}: MenuTreeViewProps) {
    if (menus.length === 0) {
        return (
            <div className="py-8 text-center text-muted-foreground text-sm">
                No menus found. Create a root menu to get started.
            </div>
        )
    }

    return (
        <div className="divide-y divide-border">
            {menus.map((menu) => (
                <MenuTreeNode
                    key={menu.menuId}
                    menu={menu}
                    depth={0}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onAddChild={onAddChild}
                    onManagePermissions={onManagePermissions}
                />
            ))}
        </div>
    )
}

interface MenuTreeNodeProps {
    menu: NormalizedMenuWithChildren
    depth: number
    onEdit: (menu: NormalizedMenuWithChildren) => void
    onDelete: (menu: NormalizedMenuWithChildren) => void
    onAddChild: (parent: NormalizedMenuWithChildren) => void
    onManagePermissions: (menu: NormalizedMenuWithChildren) => void
}

function MenuTreeNode({
    menu,
    depth,
    onEdit,
    onDelete,
    onAddChild,
    onManagePermissions,
}: MenuTreeNodeProps) {
    const [isOpen, setIsOpen] = useState(true)
    const hasChildren = menu.children && menu.children.length > 0
    const canHaveChildren = menu.menuLevel < MenuLevel.CHILD

    const levelLabel = {
        [MenuLevel.ROOT]:        "Root",
        [MenuLevel.PARENT]:      "Parent",
        [MenuLevel.CHILD]:       "Child",
        [MenuLevel.UNSPECIFIED]: "–",
    }[menu.menuLevel] ?? "–"

    const levelVariant = {
        [MenuLevel.ROOT]:        "default",
        [MenuLevel.PARENT]:      "secondary",
        [MenuLevel.CHILD]:       "outline",
        [MenuLevel.UNSPECIFIED]: "outline",
    }[menu.menuLevel] as "default" | "secondary" | "outline"

    return (
        <div>
            <div
                className={cn(
                    "group flex items-center gap-2 py-2 pr-2 hover:bg-muted/50 rounded-md",
                    depth > 0 && "ml-6"
                )}
            >
                {/* Expand/collapse toggle */}
                <button
                    type="button"
                    onClick={() => setIsOpen((v) => !v)}
                    className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-accent",
                        !hasChildren && "invisible"
                    )}
                >
                    {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                    ) : (
                        <ChevronRight className="h-4 w-4" />
                    )}
                </button>

                {/* Icon preview */}
                <span className="flex w-5 shrink-0 items-center justify-center text-muted-foreground">
                    {menu.iconName && pascalToIconName(menu.iconName) ? (
                        <DynamicIcon
                            name={pascalToIconName(menu.iconName)!}
                            className="h-4 w-4"
                            fallback={() => null}
                        />
                    ) : (
                        <span className="text-xs font-mono">–</span>
                    )}
                </span>

                {/* Menu title + url */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-sm">{menu.menuTitle}</span>
                        {!menu.isVisible && (
                            <EyeOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                        {!menu.isActive && (
                            <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                                Inactive
                            </Badge>
                        )}
                    </div>
                    {menu.menuUrl && (
                        <p className="truncate text-xs text-muted-foreground">{menu.menuUrl}</p>
                    )}
                </div>

                {/* Code */}
                <span className="hidden md:inline-block text-xs text-muted-foreground font-mono w-40 truncate shrink-0">
                    {menu.menuCode}
                </span>

                {/* Level badge */}
                <Badge variant={levelVariant} className="hidden sm:inline-flex shrink-0 text-xs">
                    {levelLabel}
                </Badge>

                {/* Sort order */}
                <span className="hidden lg:inline-block w-6 text-right text-xs text-muted-foreground shrink-0">
                    {menu.sortOrder}
                </span>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canHaveChildren && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Add child menu"
                            onClick={() => onAddChild(menu)}
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Manage permissions"
                        onClick={() => onManagePermissions(menu)}
                    >
                        <Shield className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Edit menu"
                        onClick={() => onEdit(menu)}
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        title="Delete menu"
                        onClick={() => onDelete(menu)}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* Children */}
            {hasChildren && isOpen && (
                <div>
                    {menu.children.map((child) => (
                        <MenuTreeNode
                            key={child.menuId}
                            menu={child}
                            depth={depth + 1}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onAddChild={onAddChild}
                            onManagePermissions={onManagePermissions}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
