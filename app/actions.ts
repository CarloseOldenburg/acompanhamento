"use server"

import { revalidatePath } from "next/cache"
import * as db from "../lib/database"
import type { TabData, TableRow } from "../types"

export async function getTabsAction() {
  return await db.getTabs()
}

export async function createTabAction(tab: Omit<TabData, "rows">) {
  const result = await db.createTab(tab)
  if (result.success) {
    revalidatePath("/")
  }
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
