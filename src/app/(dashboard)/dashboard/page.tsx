import { generateMetadata as genMeta } from "@/config/site"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PageHeader } from "@/components/common/page-header"
import { KpiCard } from "@/components/common/kpi-card"
import { KpiGrid } from "@/components/common/kpi-grid"
import { AreaChart } from "@/components/charts/area-chart"
import { PieChart } from "@/components/charts/pie-chart"
import {
    DollarSign,
    Users,
    ShoppingCart,
    TrendingUp,
    Construction,
} from "lucide-react"
import dashboardData from "@/data/dashboard.json"

export const metadata = genMeta("Dashboard", true)

export default function DashboardPage() {
    const { stats, monthlyData, moduleStats, recentActivities } = dashboardData

    return (
        <div>
            <PageHeader
                title="Dashboard"
                subtitle="Overview of your enterprise metrics and activities"
            />

            <div className="space-y-6">

            {/* Under Development Banner */}
            <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                <Construction className="size-4 text-amber-600 dark:text-amber-400" />
                <AlertTitle className="text-amber-800 dark:text-amber-300">
                    Under Development — Sample Data Only
                </AlertTitle>
                <AlertDescription className="text-amber-700 dark:text-amber-400">
                    <p>This page is still under development. All figures and charts displayed are <strong>sample data</strong> and do not reflect actual system data.</p>
                </AlertDescription>
            </Alert>

            {/* Stats Cards */}
            <KpiGrid cols={4}>
                <KpiCard
                    title="Total Revenue"
                    value={`$${stats.totalRevenue.toLocaleString()}`}
                    icon={DollarSign}
                    variant="success"
                    delta={{ value: 12.5, label: "from last month", trend: "up" }}
                />
                <KpiCard
                    title="Active Users"
                    value={stats.activeUsers.toLocaleString()}
                    icon={Users}
                    delta={{ value: 8.2, label: "from last month", trend: "up" }}
                />
                <KpiCard
                    title="Pending Orders"
                    value={stats.pendingOrders}
                    icon={ShoppingCart}
                    variant="warning"
                    delta={{ value: -4.3, label: "from last month", trend: "down" }}
                />
                <KpiCard
                    title="Completion Rate"
                    value={`${stats.completionRate}%`}
                    icon={TrendingUp}
                    variant="success"
                    delta={{ value: 2.1, label: "from last month", trend: "up" }}
                />
            </KpiGrid>

            {/* Charts Row */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* min-w-0 prevents grid item from expanding past its column */}
                <Card className="min-w-0 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Revenue Overview</CardTitle>
                        <CardDescription>Monthly revenue and profit trends</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[260px] w-full">
                            <AreaChart
                                data={monthlyData}
                                xAxisKey="month"
                                series={[
                                    { key: "revenue", label: "Revenue", color: "#3b82f6" },
                                    { key: "profit", label: "Profit", color: "#22c55e" },
                                ]}
                                className="h-full"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="min-w-0 lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Module Distribution</CardTitle>
                        <CardDescription>Activity by module</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PieChart data={moduleStats} chartHeight={200} />
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest actions across all modules</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {recentActivities.map((activity) => (
                            <div
                                key={activity.id}
                                className="flex flex-col gap-2 border-b pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div>
                                    <p className="text-sm font-medium">{activity.action}</p>
                                    <p className="text-xs text-muted-foreground">
                                        by {activity.user}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-4">
                                    <Badge variant="secondary">{activity.module}</Badge>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {activity.time}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            </div>
        </div>
    )
}
