"use server"

import { revalidatePath } from "next/cache"
import * as db from "../lib/database"
import type { TabData, TableRow } from "../types"

export async function getTabsAction() {
  try {
    const tabs = await db.getTabs()
    console.log("📊 getTabsAction - tabs encontradas:", tabs.length)
    return { success: true, tabs }
  } catch (error) {
    console.error("Error in getTabsAction:", error)
    return { success: false, tabs: [], error: error.message }
  }
}

export async function getTabsForAdminAction() {
  try {
    const tabs = await db.getTabs()
    return { success: true, tabs }
  } catch (error) {
    console.error("Error in getTabsForAdminAction:", error)
    return { success: false, tabs: [], error: error.message }
  }
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
    revalidatePath("/admin")
  } else {
    console.error("❌ Failed to create tab:", result.error)
  }

  console.log("=== createTabAction END ===")
  return result
}

export async function updateTabAction(tab: Omit<TabData, "rows"> & { dashboardType?: "rollout" | "testing" }) {
  console.log("🔄 updateTabAction:", tab.id, "tipo:", tab.dashboardType)

  const result = await db.updateTab(tab)

  if (result.success) {
    console.log("✅ Tab updated successfully, revalidating paths")
    revalidatePath("/")
    revalidatePath("/admin")
  } else {
    console.error("❌ Failed to update tab:", result.error)
  }

  return result
}

export async function deleteTabAction(tabId: string) {
  const result = await db.deleteTab(tabId)
  if (result.success) {
    revalidatePath("/")
    revalidatePath("/admin")
  }
  return result
}

export async function createRowAction(tabId: string, rowData: TableRow) {
  const result = await db.createRow(tabId, rowData)
  if (result.success) {
    revalidatePath("/")
    revalidatePath("/admin")
  }
  return result
}

export async function updateRowAction(tabId: string, rowData: TableRow) {
  const result = await db.updateRow(tabId, rowData)
  if (result.success) {
    revalidatePath("/")
    revalidatePath("/admin")
  }
  return result
}

export async function deleteRowAction(rowId: string) {
  const result = await db.deleteRow(rowId)
  if (result.success) {
    revalidatePath("/")
    revalidatePath("/admin")
  }
  return result
}

export async function getDatabaseStatsAction() {
  return await db.getDatabaseStats()
}
