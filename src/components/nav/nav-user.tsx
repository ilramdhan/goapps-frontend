"use client"

import { useState, useEffect } from "react"
import {
    BadgeCheck,
    Bell,
    ChevronsUpDown,
    LogOut,
    Moon,
    Settings,
    Sun,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { useAuth } from "@/providers/auth-provider"

import { UserAvatar } from "@/components/common/user-avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"

export interface NavUserProps {
    user: {
        name: string
        email: string
        avatar?: string
    }
}

export function NavUser({ user }: NavUserProps) {
    const { isMobile } = useSidebar()
    const { setTheme, resolvedTheme } = useTheme()
    const { logout } = useAuth()
    const router = useRouter()
    const [mounted, setMounted] = useState(false)

    // Prevent hydration mismatch by only rendering theme-dependent UI after mount
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: prevent hydration mismatch for theme-dependent UI
        setMounted(true)
    }, [])

    const handleLogout = async () => {
        await logout()
        window.location.href = "/login"
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            data-testid="nav-user-trigger"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <UserAvatar
                                fullName={user.name}
                                avatarUrl={user.avatar}
                                className="h-8 w-8 rounded-lg"
                                fallbackClassName="rounded-lg"
                            />
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{user.name}</span>
                                <span className="truncate text-xs">{user.email}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <UserAvatar
                                    fullName={user.name}
                                    avatarUrl={user.avatar}
                                    className="h-8 w-8 rounded-lg"
                                    fallbackClassName="rounded-lg"
                                />
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-medium">{user.name}</span>
                                    <span className="truncate text-xs">{user.email}</span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => router.push("/profile")}>
                                <BadgeCheck />
                                Account
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push("/settings")}>
                                <Settings />
                                Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push("/notifications")}>
                                <Bell />
                                Notifications
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
                                {mounted && resolvedTheme === "dark" ? <Sun /> : <Moon />}
                                {mounted && resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                            <LogOut />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
