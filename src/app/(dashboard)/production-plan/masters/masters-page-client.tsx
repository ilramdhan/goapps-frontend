"use client"

import Link from "next/link"
import {
  Boxes,
  Cog,
  Package,
  SlidersHorizontal,
  Gauge,
  AlertTriangle,
  TimerOff,
  Trash2,
  Layers,
  type LucideIcon,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/common"

interface MasterLink {
  title: string
  description: string
  href: string
  icon: LucideIcon
}

const MASTERS: MasterLink[] = [
  {
    title: "Machine Groups",
    description: "Machine groups per production area",
    href: "/production-plan/masters/machine-groups",
    icon: Boxes,
  },
  {
    title: "Machines",
    description: "Machine master (synced from Oracle)",
    href: "/production-plan/masters/machines",
    icon: Cog,
  },
  {
    title: "Lots",
    description: "Lot master data and standard weights",
    href: "/production-plan/masters/lots",
    icon: Package,
  },
  {
    title: "Product Config",
    description: "PPC planning configuration per product",
    href: "/production-plan/masters/product-config",
    icon: SlidersHorizontal,
  },
  {
    title: "Capacities",
    description: "Planning capacity per product-machine pair",
    href: "/production-plan/masters/capacities",
    icon: Gauge,
  },
  {
    title: "Machine Parameters",
    description: "Parameter values per product-machine pair",
    href: "/production-plan/masters/product-machine-parameters",
    icon: Layers,
  },
  {
    title: "Overrun Thresholds",
    description: "Warning and block thresholds by scope",
    href: "/production-plan/masters/thresholds",
    icon: AlertTriangle,
  },
  {
    title: "Downtime Reasons",
    description: "Downtime reason codes per area",
    href: "/production-plan/masters/downtime-reasons",
    icon: TimerOff,
  },
  {
    title: "Waste Categories",
    description: "Waste and downgrade categories per area",
    href: "/production-plan/masters/waste-categories",
    icon: Trash2,
  },
]

export default function MastersPageClient() {
  return (
    <div>
      <PageHeader title="PPC Masters" subtitle="Reference data for production planning" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MASTERS.map((master) => {
          const Icon = master.icon
          return (
            <Link key={master.href} href={master.href} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/50">
                <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-semibold">{master.title}</CardTitle>
                    <CardDescription className="truncate">{master.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent />
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
