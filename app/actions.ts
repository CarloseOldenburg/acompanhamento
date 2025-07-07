"use server"

import { revalidatePath } from "next/cache"
import {
  getTabs,
  getTabById,
  createTab,
  updateTab,
  deleteTab,
  createRow,
  updateRow,
  deleteRow,
  getDatabaseStats,
} from "../lib/database"
import type { TabData, TableRow } from "../types"

// ===== TAB ACTIONS =====

export async function getTabsAction() {
  try {
    console.log("🔄 Server Action: getTabsAction")
    const tabs = await getTabs()
    console.log(`✅ Retrieved ${tabs.length} tabs`)
    return { success: true, data: tabs }
  } catch (error) {
    console.error("❌ Error in getTabsAction:", error)
    return { success: false, error: error.message }
  }
}

export async function getTabByIdAction(tabId: string) {
  try {
    console.log("🔄 Server Action: getTabByIdAction", tabId)
    const tab = await getTabById(tabId)
    if (!tab) {
      return { success: false, error: "Tab not found" }
    }
    console.log(`✅ Retrieved tab: ${tab.name}`)
    return { success: true, data: tab }
  } catch (error) {
    console.error("❌ Error in getTabByIdAction:", error)
    return { success: false, error: error.message }
  }
}

export async function createTabAction(tabData: Omit<TabData, "rows">) {
  try {
    console.log("🔄 Server Action: createTabAction")
    console.log("Tab data:", tabData)

    const result = await createTab(tabData)

    if (result.success) {
      console.log("✅ Tab created successfully")
      revalidatePath("/")
      return { success: true }
    } else {
      console.error("❌ Failed to create tab:", result.error)
      return { success: false, error: result.error }
    }
  } catch (error) {
    console.error("❌ Error in createTabAction:", error)
    return { success: false, error: error.message }
  }
}

export async function updateTabAction(tabData: Omit<TabData, "rows"> & { dashboardType?: "rollout" | "testing" }) {
  try {
    console.log("🔄 Server Action: updateTabAction")
    console.log("Tab data:", tabData)

    const result = await updateTab(tabData)

    if (result.success) {
      console.log("✅ Tab updated successfully")
      revalidatePath("/")
      return { success: true }
    } else {
      console.error("❌ Failed to update tab:", result.error)
      return { success: false, error: result.error }
    }
  } catch (error) {
    console.error("❌ Error in updateTabAction:", error)
    return { success: false, error: error.message }
  }
}

export async function deleteTabAction(tabId: string) {
  try {
    console.log("🔄 Server Action: deleteTabAction", tabId)

    const result = await deleteTab(tabId)

    if (result.success) {
      console.log("✅ Tab deleted successfully")
      revalidatePath("/")
      return { success: true }
    } else {
      console.error("❌ Failed to delete tab:", result.error)
      return { success: false, error: result.error }
    }
  } catch (error) {
    console.error("❌ Error in deleteTabAction:", error)
    return { success: false, error: error.message }
  }
}

// ===== ROW ACTIONS =====

export async function createRowAction(tabId: string, rowData: TableRow) {
  try {
    console.log("🔄 Server Action: createRowAction")
    console.log("Tab ID:", tabId)
    console.log("Row data:", rowData)

    const result = await createRow(tabId, rowData)

    if (result.success) {
      console.log("✅ Row created successfully")
      revalidatePath("/")
      return { success: true }
    } else {
      console.error("❌ Failed to create row:", result.error)
      return { success: false, error: result.error }
    }
  } catch (error) {
    console.error("❌ Error in createRowAction:", error)
    return { success: false, error: error.message }
  }
}

// Alias para createRowAction (para compatibilidade)
export const addRowAction = createRowAction

export async function updateRowAction(tabId: string, rowData: TableRow) {
  try {
    console.log("🔄 Server Action: updateRowAction")
    console.log("Tab ID:", tabId)
    console.log("Row data:", rowData)

    const result = await updateRow(tabId, rowData)

    if (result.success) {
      console.log("✅ Row updated successfully")
      revalidatePath("/")
      return { success: true }
    } else {
      console.error("❌ Failed to update row:", result.error)
      return { success: false, error: result.error }
    }
  } catch (error) {
    console.error("❌ Error in updateRowAction:", error)
    return { success: false, error: error.message }
  }
}

export async function deleteRowAction(tabId: string, rowId: string) {
  try {
    console.log("🔄 Server Action: deleteRowAction", rowId)

    const result = await deleteRow(rowId)

    if (result.success) {
      console.log("✅ Row deleted successfully")
      revalidatePath("/")
      return { success: true }
    } else {
      console.error("❌ Failed to delete row:", result.error)
      return { success: false, error: result.error }
    }
  } catch (error) {
    console.error("❌ Error in deleteRowAction:", error)
    return { success: false, error: error.message }
  }
}

// ===== BULK OPERATIONS =====

export async function bulkCreateRowsAction(tabId: string, rowsData: any[]) {
  try {
    console.log("🔄 Server Action: bulkCreateRowsAction")
    console.log(`Creating ${rowsData.length} rows for tab ${tabId}`)

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const rowData of rowsData) {
      try {
        const result = await createRow(tabId, rowData)
        if (result.success) {
          successCount++
        } else {
          errorCount++
          errors.push(result.error || "Unknown error")
        }
      } catch (error) {
        errorCount++
        errors.push(error.message || "Unknown error")
      }
    }

    console.log(`✅ Bulk create completed: ${successCount} success, ${errorCount} errors`)

    if (successCount > 0) {
      revalidatePath("/")
    }

    return {
      success: true,
      imported: successCount,
      errors: errorCount,
      errorMessages: errors.slice(0, 5), // Only return first 5 errors
    }
  } catch (error) {
    console.error("❌ Error in bulkCreateRowsAction:", error)
    return { success: false, error: error.message }
  }
}

export async function bulkUpdateRowsAction(tabId: string, updates: Array<{ id: string; data: any }>) {
  try {
    console.log("🔄 Server Action: bulkUpdateRowsAction")
    console.log(`Updating ${updates.length} rows for tab ${tabId}`)

    let successCount = 0
    let errorCount = 0

    for (const update of updates) {
      try {
        const result = await updateRow(tabId, { id: update.id, ...update.data })
        if (result.success) {
          successCount++
        } else {
          errorCount++
        }
      } catch (error) {
        errorCount++
      }
    }

    console.log(`✅ Bulk update completed: ${successCount} success, ${errorCount} errors`)

    if (successCount > 0) {
      revalidatePath("/")
    }

    return {
      success: true,
      updated: successCount,
      errors: errorCount,
    }
  } catch (error) {
    console.error("❌ Error in bulkUpdateRowsAction:", error)
    return { success: false, error: error.message }
  }
}

export async function bulkDeleteRowsAction(rowIds: string[]) {
  try {
    console.log("🔄 Server Action: bulkDeleteRowsAction")
    console.log(`Deleting ${rowIds.length} rows`)

    let successCount = 0
    let errorCount = 0

    for (const rowId of rowIds) {
      try {
        const result = await deleteRow(rowId)
        if (result.success) {
          successCount++
        } else {
          errorCount++
        }
      } catch (error) {
        errorCount++
      }
    }

    console.log(`✅ Bulk delete completed: ${successCount} success, ${errorCount} errors`)

    if (successCount > 0) {
      revalidatePath("/")
    }

    return {
      success: true,
      deleted: successCount,
      errors: errorCount,
    }
  } catch (error) {
    console.error("❌ Error in bulkDeleteRowsAction:", error)
    return { success: false, error: error.message }
  }
}

// ===== UTILITY ACTIONS =====

export async function getDatabaseStatsAction() {
  try {
    console.log("🔄 Server Action: getDatabaseStatsAction")
    const stats = await getDatabaseStats()
    console.log("✅ Database stats retrieved:", stats)
    return { success: true, data: stats }
  } catch (error) {
    console.error("❌ Error in getDatabaseStatsAction:", error)
    return { success: false, error: error.message }
  }
}

// ===== IMPORT/EXPORT ACTIONS =====

export async function importDataAction(tabId: string, data: any[]) {
  try {
    console.log("🔄 Server Action: importDataAction")
    console.log(`Importing ${data.length} records to tab ${tabId}`)

    return await bulkCreateRowsAction(tabId, data)
  } catch (error) {
    console.error("❌ Error in importDataAction:", error)
    return { success: false, error: error.message }
  }
}

export async function exportDataAction(tabId: string) {
  try {
    console.log("🔄 Server Action: exportDataAction", tabId)

    const tab = await getTabById(tabId)
    if (!tab) {
      return { success: false, error: "Tab not found" }
    }

    const exportData = {
      tabInfo: {
        id: tab.id,
        name: tab.name,
        dashboardType: tab.dashboardType,
        columns: tab.columns,
        exportDate: new Date().toISOString(),
      },
      data: tab.rows,
    }

    console.log(`✅ Exported ${tab.rows.length} records from tab ${tab.name}`)
    return { success: true, data: exportData }
  } catch (error) {
    console.error("❌ Error in exportDataAction:", error)
    return { success: false, error: error.message }
  }
}
