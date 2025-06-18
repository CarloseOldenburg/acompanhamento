import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { spreadsheetId, sheetName, accessToken } = await request.json()

    console.log("=== DEBUG SHEET DATA API ===")
    console.log("Spreadsheet ID:", spreadsheetId)
    console.log("Sheet name:", sheetName)
    console.log("Access token present:", !!accessToken)

    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Google API key not configured" }, { status: 500 })
    }

    if (!accessToken || !spreadsheetId || !sheetName) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    const origin =
      request.headers.get("origin") || request.headers.get("referer") || "https://acompanhamento.proxmox-carlos.com.br"

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Referer: origin,
      Origin: origin,
      "User-Agent": "Mozilla/5.0 (compatible; NextJS-GoogleSheets/1.0)",
    }

    // Test different approaches to get sheet data
    const results = []

    // Method 1: Basic sheet name
    try {
      const url1 = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}?key=${apiKey}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`
      console.log("Method 1 URL:", url1)

      const response1 = await fetch(url1, { headers })
      const data1 = response1.ok ? await response1.json() : null

      results.push({
        method: "Basic sheet name",
        url: url1,
        status: response1.status,
        success: response1.ok,
        dataLength: data1?.values?.length || 0,
        firstRow: data1?.values?.[0]?.slice(0, 3) || [],
        secondRow: data1?.values?.[1]?.slice(0, 3) || [],
        fullData: data1?.values || [], // Return full data
        error: response1.ok ? null : await response1.text(),
      })
    } catch (error: any) {
      results.push({
        method: "Basic sheet name",
        success: false,
        error: error.message,
        fullData: [],
      })
    }

    // Method 2: Sheet with range A:ZZ (expanded range)
    try {
      const url2 = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:ZZ?key=${apiKey}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`
      console.log("Method 2 URL:", url2)

      const response2 = await fetch(url2, { headers })
      const data2 = response2.ok ? await response2.json() : null

      results.push({
        method: "Sheet with A:ZZ range",
        url: url2,
        status: response2.status,
        success: response2.ok,
        dataLength: data2?.values?.length || 0,
        firstRow: data2?.values?.[0]?.slice(0, 3) || [],
        secondRow: data2?.values?.[1]?.slice(0, 3) || [],
        fullData: data2?.values || [], // Return full data
        error: response2.ok ? null : await response2.text(),
      })
    } catch (error: any) {
      results.push({
        method: "Sheet with A:ZZ range",
        success: false,
        error: error.message,
        fullData: [],
      })
    }

    // Method 3: Sheet with specific range A1:ZZ1000 (much larger range)
    try {
      const url3 = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:ZZ1000?key=${apiKey}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`
      console.log("Method 3 URL:", url3)

      const response3 = await fetch(url3, { headers })
      const data3 = response3.ok ? await response3.json() : null

      results.push({
        method: "Sheet with A1:ZZ1000 range",
        url: url3,
        status: response3.status,
        success: response3.ok,
        dataLength: data3?.values?.length || 0,
        firstRow: data3?.values?.[0]?.slice(0, 3) || [],
        secondRow: data3?.values?.[1]?.slice(0, 3) || [],
        fullData: data3?.values || [], // Return full data
        error: response3.ok ? null : await response3.text(),
      })
    } catch (error: any) {
      results.push({
        method: "Sheet with A1:ZZ1000 range",
        success: false,
        error: error.message,
        fullData: [],
      })
    }

    // Method 4: Get spreadsheet with includeGridData
    try {
      const url4 = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}&includeGridData=true`
      console.log("Method 4 URL:", url4)

      const response4 = await fetch(url4, { headers })
      const data4 = response4.ok ? await response4.json() : null

      let extractedData = []
      if (data4?.sheets) {
        const targetSheet = data4.sheets.find((sheet: any) => sheet.properties?.title === sheetName)
        if (targetSheet?.data?.[0]?.rowData) {
          extractedData = targetSheet.data[0].rowData
            .map(
              (row: any) =>
                row.values?.map(
                  (cell: any) =>
                    cell.formattedValue ||
                    cell.userEnteredValue?.stringValue ||
                    cell.userEnteredValue?.numberValue ||
                    "",
                ) || [],
            )
            .filter((row: any[]) => row.some((cell) => cell !== ""))
        }
      }

      results.push({
        method: "Grid data API",
        url: url4,
        status: response4.status,
        success: response4.ok,
        dataLength: extractedData.length,
        firstRow: extractedData[0]?.slice(0, 3) || [],
        secondRow: extractedData[1]?.slice(0, 3) || [],
        fullData: extractedData, // Return full extracted data
        error: response4.ok ? null : await response4.text(),
      })
    } catch (error: any) {
      results.push({
        method: "Grid data API",
        success: false,
        error: error.message,
        fullData: [],
      })
    }

    // Method 5: List all sheets to verify sheet name
    try {
      const url5 = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`
      const response5 = await fetch(url5, { headers })
      const data5 = response5.ok ? await response5.json() : null

      results.push({
        method: "List sheets",
        url: url5,
        status: response5.status,
        success: response5.ok,
        availableSheets:
          data5?.sheets?.map((sheet: any) => ({
            title: sheet.properties?.title,
            id: sheet.properties?.sheetId,
            rowCount: sheet.properties?.gridProperties?.rowCount,
            columnCount: sheet.properties?.gridProperties?.columnCount,
          })) || [],
        requestedSheet: sheetName,
        fullData: [], // No data for this method
        error: response5.ok ? null : await response5.text(),
      })
    } catch (error: any) {
      results.push({
        method: "List sheets",
        success: false,
        error: error.message,
        fullData: [],
      })
    }

    // Find the best result with the most data
    const bestResult = results
      .filter((r) => r.success && r.fullData && r.fullData.length > 0)
      .sort((a, b) => (b.fullData?.length || 0) - (a.fullData?.length || 0))[0]

    console.log("=== BEST RESULT ANALYSIS ===")
    if (bestResult) {
      console.log("Best method:", bestResult.method)
      console.log("Data length:", bestResult.fullData?.length || 0)
      console.log("First 3 rows preview:")
      bestResult.fullData?.slice(0, 3).forEach((row: any[], index: number) => {
        console.log(`  Row ${index + 1}:`, row.slice(0, 5))
      })
    } else {
      console.log("No successful results found")
    }

    return NextResponse.json({
      success: true,
      spreadsheetId,
      sheetName,
      origin,
      results,
      summary: {
        totalMethods: results.length,
        successfulMethods: results.filter((r) => r.success).length,
        methodsWithData: results.filter((r) => r.fullData && r.fullData.length > 0).length,
        bestResult: bestResult || null,
        maxDataLength: Math.max(...results.map((r) => r.fullData?.length || 0)),
      },
    })
  } catch (error: any) {
    console.error("Debug sheet data error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
