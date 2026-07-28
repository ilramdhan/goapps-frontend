"use client"

import Link from "next/link"
import { Sunrise, Package, Activity, ArrowRight } from "lucide-react"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/common/page-header"

const DASHBOARDS = [
  {
    href: "/production-plan/dashboard/morning-review",
    title: "Morning Review",
    description: "Actual vs plan, open issues, and the day's production priorities.",
    icon: Sunrise,
  },
  {
    href: "/production-plan/dashboard/balance-for-sale",
    title: "Balance for Sale",
    description: "Sellable balance per commodity-watch product (stock + WO + MTS − committed).",
    icon: Package,
  },
  {
    href: "/production-plan/dashboard/daily-performance",
    title: "Daily Performance",
    description: "KPIs and the machine-efficiency grid for the selected day.",
    icon: Activity,
  },
]

export default function DashboardIndexClient() {
  return (
    <div className="space-y-6">
      <PageHeader title="Production Dashboards" subtitle="Planning & control analytics" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {DASHBOARDS.map((d) => (
          <Link key={d.href} href={d.href} className="group">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <d.icon className="h-4 w-4" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <CardTitle className="mt-2 text-sm font-semibold">{d.title}</CardTitle>
                <CardDescription className="text-xs">{d.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
