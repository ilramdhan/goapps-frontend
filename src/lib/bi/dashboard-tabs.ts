// Tab dashboard generik (PP-09): dashboard satu grup saling berpindah lewat layout_config.nav_tab
// {group, label, permission}. Logika murni, dipisah dari komponen supaya mudah diuji.

export interface DashboardTab {
  code: string
  label: string
  order: number
}

interface TabSource {
  dashboardCode: string
  displayOrder?: number
  layoutConfig?: Record<string, unknown> | null
}

interface NavTabConfig {
  group?: string
  label?: string
  permission?: string
}

/**
 * Tab untuk grup dashboard `code`; kosong bila `code` tidak punya nav_tab atau grupnya hanya satu tab.
 * nav_tab tanpa `group` (HR Workforce, migrasi 000598) membentuk satu grup bawaan sendiri.
 */
export function resolveDashboardTabs(
  code: string,
  dashboards: TabSource[],
  hasPermission: (permission: string) => boolean,
): DashboardTab[] {
  const nav = (d: TabSource) => d.layoutConfig?.nav_tab as NavTabConfig | undefined
  const current = dashboards.find((d) => d.dashboardCode === code)
  const currentNav = current && nav(current)
  if (!currentNav) return []
  const group = currentNav.group ?? ""

  const tabs = dashboards
    .flatMap((d) => {
      const n = nav(d)
      if (!n || (n.group ?? "") !== group || !n.label) return []
      if (n.permission && !hasPermission(n.permission)) return []
      return [{ code: d.dashboardCode, label: n.label, order: d.displayOrder ?? 0 }]
    })
    .sort((a, b) => a.order - b.order)

  return tabs.length < 2 || !tabs.some((t) => t.code === code) ? [] : tabs
}
