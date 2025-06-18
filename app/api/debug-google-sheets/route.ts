import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { spreadsheetId, accessToken } = await request.json()

    console.log("=== DEBUG GOOGLE SHEETS API ===")
    console.log("Spreadsheet ID:", spreadsheetId)
    console.log("Access token present:", !!accessToken)
    console.log("Access token length:", accessToken?.length || 0)

    const apiKey = process.env.GOOGLE_API_KEY
    console.log("API key present:", !!apiKey)
    console.log("API key length:", apiKey?.length || 0)

    if (!apiKey) {
      return NextResponse.json({ error: "Google API key not configured on server" }, { status: 500 })
    }

    if (!accessToken) {
      return NextResponse.json({ error: "Access token is required" }, { status: 400 })
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`
    console.log("Request URL:", url)

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    }
    console.log("Request headers:", { ...headers, Authorization: "Bearer [REDACTED]" })

    const response = await fetch(url, { headers })

    console.log("Response status:", response.status)
    console.log("Response headers:", Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error("API Error Response:", errorText)

      let parsedError
      try {
        parsedError = JSON.parse(errorText)
      } catch {
        parsedError = { message: errorText }
      }

      return NextResponse.json(
        {
          error: "Google Sheets API Error",
          status: response.status,
          details: parsedError,
          rawError: errorText,
        },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log("Success! Spreadsheet title:", data.properties?.title)
    console.log("Number of sheets:", data.sheets?.length || 0)

    return NextResponse.json({
      success: true,
      data: {
        title: data.properties?.title,
        sheets: data.sheets?.map((sheet: any) => ({
          id: sheet.properties.sheetId,
          title: sheet.properties.title,
          rowCount: sheet.properties.gridProperties.rowCount,
          columnCount: sheet.properties.gridProperties.columnCount,
        })),
      },
    })
  } catch (error: any) {
    console.error("=== DEBUG ENDPOINT ERROR ===")
    console.error("Error type:", error.constructor.name)
    console.error("Error message:", error.message)
    console.error("Error stack:", error.stack)

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
        type: error.constructor.name,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
