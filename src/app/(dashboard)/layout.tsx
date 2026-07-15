"use client"

import { useAuth } from "@/providers/auth-provider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import {
    BreadcrumbOverrideProvider,
    DynamicBreadcrumb,
} from "@/components/common/dynamic-breadcrumb"
import { NotificationBell } from "@/components/iam/notifications/notification-bell"
import { Footer } from "@/components/common/footer"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { ChatFab } from "@/components/iam/chat/chat-fab"
import { ChatDrawer } from "@/components/iam/chat/chat-drawer"
import { ChatbotFab } from "@/components/chatbot/chatbot-fab"
import { ChatbotPanel } from "@/components/chatbot/chatbot-panel"

function DashboardSkeleton() {
    return (
        <div className="flex h-svh w-full">
            {/* Sidebar skeleton */}
            <div className="hidden md:flex w-64 flex-col border-r bg-background p-4 gap-4">
                <Skeleton className="h-8 w-32" />
                <div className="space-y-2 mt-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full" />
                    ))}
                </div>
            </div>
            {/* Main content skeleton */}
            <div className="flex-1 flex flex-col">
                <div className="h-16 border-b flex items-center px-4 gap-2">
                    <Skeleton className="h-6 w-6" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <div className="flex-1 p-4 space-y-4">
                    <Skeleton className="h-8 w-64" />
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-32 w-full rounded-lg" />
                        ))}
                    </div>
                    <Skeleton className="h-64 w-full rounded-lg" />
                </div>
            </div>
        </div>
    )
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { isAuthenticated, isLoading, user } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/")
        }
    }, [isLoading, isAuthenticated, router])

    // Redirect to email verification if authenticated but email not verified
    useEffect(() => {
        if (!isLoading && isAuthenticated && user && user.emailVerified === false) {
            router.push("/verify-email")
        }
    }, [isLoading, isAuthenticated, user, router])

    // Show skeleton while checking auth
    if (isLoading) {
        return <DashboardSkeleton />
    }

    // Don't render dashboard content for unauthenticated users
    if (!isAuthenticated) {
        return <DashboardSkeleton />
    }

    return (
        <SidebarProvider>
            <BreadcrumbOverrideProvider>
            <AppSidebar />
            <SidebarInset className="min-w-0">
                {/* Sticky header with breadcrumbs */}
                <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex flex-1 items-center gap-2 px-4 min-w-0">
                        <SidebarTrigger className="-ml-1 shrink-0" />
                        <Separator
                            orientation="vertical"
                            className="mr-2 shrink-0 data-[orientation=vertical]:h-4"
                        />
                        <div className="min-w-0 flex-1 truncate">
                            <DynamicBreadcrumb />
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <NotificationBell />
                        </div>
                    </div>
                </header>
                {/* Main content */}
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0 min-w-0 overflow-x-hidden">
                    <main className="flex-1 pt-4 min-w-0 w-full">
                        {children}
                    </main>
                    <Footer />
                </div>
            </SidebarInset>
            </BreadcrumbOverrideProvider>
            {/* Floating action buttons — survive navigation */}
            <div className="fixed bottom-6 right-6 flex items-center gap-3 z-50">
                <ChatbotFab />
                <ChatFab />
            </div>
            <ChatbotPanel />
            <ChatDrawer currentUserId={user?.userId ?? ""} />
        </SidebarProvider>
    )
}
