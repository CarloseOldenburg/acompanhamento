import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    console.log("=== DEBUG DATABASE START ===")

    // Check if tables exist
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `
    console.log("Tables in database:", tablesResult)

    // Check tabs table
    const tabsResult = await sql`SELECT * FROM tabs ORDER BY created_at DESC LIMIT 5`
    console.log("Recent tabs:", tabsResult)

    // Check tab_rows table
    const rowsResult = await sql`SELECT * FROM tab_rows ORDER BY created_at DESC LIMIT 10`
    console.log("Recent rows:", rowsResult)

    // Count records
    const [tabCount] = await sql`SELECT COUNT(*) as count FROM tabs`
    const [rowCount] = await sql`SELECT COUNT(*) as count FROM tab_rows`

    const result = {
      success: true,
      tables: tablesResult,
      recentTabs: tabsResult,
      recentRows: rowsResult,
      counts: {
        tabs: tabCount.count,
        rows: rowCount.count,
      },
    }

    console.log("Database debug result:", result)
    console.log("=== DEBUG DATABASE END ===")

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("=== DEBUG DATABASE ERROR ===")
    console.error("Error:", error.message)
    console.error("Stack:", error.stack)
    console.error("=== DEBUG DATABASE ERROR END ===")

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
