import { neon } from "@neondatabase/serverless"
import type { TabData, TableRow } from "../types"

// Verificar se a variável de ambiente existe
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set")
  throw new Error("DATABASE_URL environment variable is required")
}

const sql = neon(process.env.DATABASE_URL)

export async function getTabs(): Promise<TabData[]> {
  try {
    // First try to get tabs with dashboard_type column
    let tabs
    try {
      tabs = await sql`
        SELECT id, name, columns, dashboard_type, created_at, updated_at 
        FROM tabs 
        ORDER BY created_at ASC
      `
    } catch (error) {
      // If dashboard_type column doesn't exist, fall back to basic query
      console.log("dashboard_type column not found, using fallback query")
      tabs = await sql`
        SELECT id, name, columns, created_at, updated_at 
        FROM tabs 
        ORDER BY created_at ASC
      `
    }

    const tabsWithRows = await Promise.all(
      tabs.map(async (tab) => {
        const rows = await sql`
          SELECT id, data, created_at, updated_at 
          FROM tab_rows 
          WHERE tab_id = ${tab.id}
          ORDER BY created_at ASC
        `

        // Determine dashboard type based on name if column doesn't exist
        const dashboardType =
          tab.dashboard_type ||
          (tab.name.toLowerCase().includes("teste") || tab.name.toLowerCase().includes("integra")
            ? "testing"
            : "rollout")

        return {
          id: tab.id,
          name: tab.name,
          columns: tab.columns,
          dashboardType,
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

export async function getTabById(tabId: string): Promise<TabData | null> {
  try {
    console.log("=== DATABASE getTabById START ===")
    console.log("Fetching tab:", tabId)

    // First try to get tab with dashboard_type column
    let tab
    try {
      const tabs = await sql`
        SELECT id, name, columns, dashboard_type, created_at, updated_at 
        FROM tabs 
        WHERE id = ${tabId}
        LIMIT 1
      `
      tab = tabs[0]
    } catch (error) {
      // If dashboard_type column doesn't exist, fall back to basic query
      console.log("dashboard_type column not found, using fallback query")
      const tabs = await sql`
        SELECT id, name, columns, created_at, updated_at 
        FROM tabs 
        WHERE id = ${tabId}
        LIMIT 1
      `
      tab = tabs[0]
    }

    if (!tab) {
      console.log("Tab not found:", tabId)
      return null
    }

    // Get all rows for this tab
    const rows = await sql`
      SELECT id, data, created_at, updated_at 
      FROM tab_rows 
      WHERE tab_id = ${tabId}
      ORDER BY created_at ASC
    `

    // Determine dashboard type based on name if column doesn't exist
    const dashboardType =
      tab.dashboard_type ||
      (tab.name.toLowerCase().includes("teste") || tab.name.toLowerCase().includes("integra") ? "testing" : "rollout")

    const result = {
      id: tab.id,
      name: tab.name,
      columns: tab.columns,
      dashboardType,
      rows: rows.map((row) => ({
        id: row.id,
        ...row.data,
      })),
    }

    console.log("✅ Tab fetched successfully:", result.name)
    console.log("=== DATABASE getTabById END ===")
    return result
  } catch (error) {
    console.error("=== DATABASE getTabById ERROR ===")
    console.error("Error fetching tab by ID:", error)
    console.error("Error message:", error.message)
    console.error("=== DATABASE getTabById ERROR END ===")
    return null
  }
}

export async function createTab(tab: Omit<TabData, "rows">) {
  try {
    console.log("=== DATABASE createTab START ===")
    console.log("Creating tab:", tab.id, tab.name)
    console.log("Columns to insert:", tab.columns)
    console.log("Dashboard type:", tab.dashboardType || "rollout")

    // Try to insert with dashboard_type, fall back if column doesn't exist
    try {
      await sql`
        INSERT INTO tabs (id, name, columns, dashboard_type)
        VALUES (${tab.id}, ${tab.name}, ${JSON.stringify(tab.columns)}, ${tab.dashboardType || "rollout"})
      `
    } catch (error) {
      if (error.message.includes("dashboard_type")) {
        console.log("dashboard_type column not found, using fallback insert")
        await sql`
          INSERT INTO tabs (id, name, columns)
          VALUES (${tab.id}, ${tab.name}, ${JSON.stringify(tab.columns)})
        `
      } else {
        throw error
      }
    }

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

export async function updateTab(tab: Omit<TabData, "rows"> & { dashboardType?: "rollout" | "testing" }) {
  try {
    console.log("🔄 Database updateTab:", tab.id, "tipo:", tab.dashboardType)

    // Try to update with dashboard_type, fall back if column doesn't exist
    try {
      await sql`
        UPDATE tabs 
        SET 
          name = ${tab.name}, 
          columns = ${JSON.stringify(tab.columns)},
          dashboard_type = ${tab.dashboardType || "rollout"},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${tab.id}
      `
    } catch (error) {
      if (error.message.includes("dashboard_type")) {
        console.log("dashboard_type column not found, using fallback update")
        await sql`
          UPDATE tabs 
          SET 
            name = ${tab.name}, 
            columns = ${JSON.stringify(tab.columns)},
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ${tab.id}
        `
      } else {
        throw error
      }
    }

    console.log("✅ Tab updated in database")
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

// Função para buscar linhas por tab ID
export async function getRowsByTabId(tabId: string) {
  try {
    const rows = await sql`
      SELECT id, data, created_at, updated_at 
      FROM tab_rows 
      WHERE tab_id = ${tabId}
      ORDER BY created_at ASC
    `

    return rows.map((row) => ({
      id: row.id,
      ...row.data,
    }))
  } catch (error) {
    console.error("Error fetching rows by tab ID:", error)
    return []
  }
}

// Função para contar registros por status
export async function getStatusCountsByTabId(tabId: string) {
  try {
    const rows = await sql`
      SELECT data 
      FROM tab_rows 
      WHERE tab_id = ${tabId}
    `

    const statusCounts: { [key: string]: number } = {}

    rows.forEach((row) => {
      const status = row.data?.status || "Sem Status"
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })

    return statusCounts
  } catch (error) {
    console.error("Error fetching status counts:", error)
    return {}
  }
}
