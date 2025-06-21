export interface Column {
  key: string
  label: string
  type: "text" | "select" | "date" | "datetime" | "number"
  options?: string[]
  width?: number
}

export interface TableRow {
  id: string
  [key: string]: any
}

export interface TabData {
  id: string
  name: string
  columns: Column[]
  dashboardType?: "rollout" | "testing"
  rows: TableRow[]
}

export interface GoogleSheetsConfig {
  spreadsheetId: string
  range: string
  tabId: string
}
