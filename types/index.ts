export interface TableRow {
  id: string
  [key: string]: any
}

export interface Column {
  key: string
  label: string
  type: "text" | "select" | "date" | "datetime"
  options?: string[]
  width?: number
}

export interface TabData {
  id: string
  name: string
  columns: Column[]
  rows: TableRow[]
}

export interface DashboardData {
  tabId: string
  tabName: string
  statusCounts: { [key: string]: number }
  totalRecords: number
  recentActivity: TableRow[]
}
