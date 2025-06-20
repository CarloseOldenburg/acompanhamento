import { neon } from "@neondatabase/serverless"
import type { TabData, TableRow } from "../types"

const sql = neon(process.env.DATABASE_URL!)

export async function getTabs(): Promise<TabData[]> {
  try {
    const tabs = await sql`
      SELECT id, name, columns, created_at, updated_at 
      FROM tabs 
      ORDER BY created_at ASC
    `

    const tabsWithRows = await Promise.all(
      tabs.map(async (tab) => {
        const rows = await sql`
          SELECT id, data, created_at, updated_at 
          FROM tab_rows 
          WHERE tab_id = ${tab.id}
          ORDER BY created_at ASC
        `

        return {
          id: tab.id,
          name: tab.name,
          columns: tab.columns,
          rows: rows.map((row) => ({
            id: row.id,
            ...row.data,
          })),
        }
      }),
    )

    return tabsWithRows
  } catch (error) {
    console.error("Error fetching tabs:", error)
    return []
  }
}

export async function createTab(tab: Omit<TabData, "rows">) {
  try {
    console.log("=== DATABASE createTab START ===")
    console.log("Creating tab:", tab.id, tab.name)
    console.log("Columns to insert:", tab.columns)
    console.log("Columns JSON:", JSON.stringify(tab.columns))

    await sql`
      INSERT INTO tabs (id, name, columns)
      VALUES (${tab.id}, ${tab.name}, ${JSON.stringify(tab.columns)})
    `

    console.log("✅ Tab inserted successfully into database")
    console.log("=== DATABASE createTab END ===")
    return { success: true }
  } catch (error) {
    console.error("=== DATABASE createTab ERROR ===")
    console.error("Error creating tab:", error)
    console.error("Error message:", error.message)
    console.error("Error stack:", error.stack)
    console.error("=== DATABASE createTab ERROR END ===")
    return { success: false, error: error.message }
  }
}

export async function updateTab(tab: Omit<TabData, "rows">) {
  try {
    await sql`
      UPDATE tabs 
      SET name = ${tab.name}, columns = ${JSON.stringify(tab.columns)}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${tab.id}
    `
    return { success: true }
  } catch (error) {
    console.error("Error updating tab:", error)
    return { success: false, error: error.message }
  }
}

export async function deleteTab(tabId: string) {
  try {
    // Primeiro deletar todas as linhas da aba
    await sql`DELETE FROM tab_rows WHERE tab_id = ${tabId}`

    // Depois deletar a aba
    await sql`DELETE FROM tabs WHERE id = ${tabId}`

    console.log(`✅ Tab ${tabId} and all its rows deleted successfully`)
    return { success: true }
  } catch (error) {
    console.error("Error deleting tab:", error)
    return { success: false, error: error.message }
  }
}

export async function createRow(tabId: string, rowData: TableRow) {
  try {
    const { id, ...data } = rowData
    await sql`
      INSERT INTO tab_rows (id, tab_id, data)
      VALUES (${id}, ${tabId}, ${JSON.stringify(data)})
    `
    return { success: true }
  } catch (error) {
    console.error("Error creating row:", error)
    return { success: false, error: error.message }
  }
}

export async function updateRow(tabId: string, rowData: TableRow) {
  try {
    const { id, ...data } = rowData
    await sql`
      UPDATE tab_rows 
      SET data = ${JSON.stringify(data)}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND tab_id = ${tabId}
    `
    return { success: true }
  } catch (error) {
    console.error("Error updating row:", error)
    return { success: false, error: error.message }
  }
}

export async function deleteRow(rowId: string) {
  try {
    await sql`DELETE FROM tab_rows WHERE id = ${rowId}`
    return { success: true }
  } catch (error) {
    console.error("Error deleting row:", error)
    return { success: false, error: error.message }
  }
}

export async function getDatabaseStats() {
  try {
    const [tabCount] = await sql`SELECT COUNT(*) as count FROM tabs`
    const [rowCount] = await sql`SELECT COUNT(*) as count FROM tab_rows`
    const [recentActivity] = await sql`
      SELECT COUNT(*) as count 
      FROM tab_rows 
      WHERE updated_at > NOW() - INTERVAL '24 hours'
    `

    return {
      totalTabs: tabCount.count,
      totalRows: rowCount.count,
      recentActivity: recentActivity.count,
      lastUpdate: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Error fetching database stats:", error)
    return {
      totalTabs: 0,
      totalRows: 0,
      recentActivity: 0,
      lastUpdate: new Date().toISOString(),
    }
  }
}
