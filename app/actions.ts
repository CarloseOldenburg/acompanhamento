"use server"

import { revalidatePath } from "next/cache"
import * as db from "../lib/database"
import type { TabData, TableRow } from "../types"

export async function getTabsAction() {
  return await db.getTabs()
}

export async function createTabAction(tab: Omit<TabData, "rows">) {
  console.log("=== createTabAction START ===")
  console.log("Tab data received:", tab)
  console.log("Tab ID:", tab.id)
  console.log("Tab name:", tab.name)
  console.log("Columns count:", tab.columns.length)
  console.log("Columns:", tab.columns)

  const result = await db.createTab(tab)

  console.log("Database createTab result:", result)

  if (result.success) {
    console.log("✅ Tab created successfully, calling revalidatePath")
    revalidatePath("/")
  } else {
    console.error("❌ Failed to create tab:", result.error)
  }

  console.log("=== createTabAction END ===")
  return result
}

export async function updateTabAction(tab: Omit<TabData, "rows">) {
  const result = await db.updateTab(tab)
  if (result.success) {
    revalidatePath("/")
  }
  return result
}

export async function deleteTabAction(tabId: string) {
  const result = await db.deleteTab(tabId)
  if (result.success) {
    revalidatePath("/")
  }
  return result
}

export async function createRowAction(tabId: string, rowData: TableRow) {
  const result = await db.createRow(tabId, rowData)
  if (result.success) {
    revalidatePath("/")
  }
  return result
}

export async function updateRowAction(tabId: string, rowData: TableRow) {
  const result = await db.updateRow(tabId, rowData)
  if (result.success) {
    revalidatePath("/")
  }
  return result
}

export async function deleteRowAction(rowId: string) {
  const result = await db.deleteRow(rowId)
  if (result.success) {
    revalidatePath("/")
  }
  return result
}

export async function getDatabaseStatsAction() {
  return await db.getDatabaseStats()
}
