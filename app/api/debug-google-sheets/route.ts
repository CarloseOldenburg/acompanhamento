import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { spreadsheetId, accessToken, sheetName } = await request.json()

    console.log("=== DEBUG GOOGLE SHEETS API ===")
    console.log("Spreadsheet ID:", spreadsheetId)
    console.log("Sheet name:", sheetName)
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

    // Get the origin from the request headers
    const origin =
      request.headers.get("origin") || request.headers.get("referer") || "https://acompanhamento.proxmox-carlos.com.br"
    console.log("Request origin:", origin)

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Referer: origin,
      Origin: origin,
      "User-Agent": "Mozilla/5.0 (compatible; NextJS-GoogleSheets/1.0)",
    }

    // If sheetName is provided, try to get sheet data
    if (sheetName) {
      console.log("=== GETTING SHEET DATA ===")

      const encodedSheetName = encodeURIComponent(sheetName)
      const ranges = [
        `${encodedSheetName}!A:ZZ`,
        `${encodedSheetName}!A1:ZZ1000`,
        `${encodedSheetName}`,
        encodedSheetName,
      ]

      for (const range of ranges) {
        try {
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`
          console.log(`Trying range: ${range}`)
          console.log(`URL: ${url}`)

          const response = await fetch(url, {
            headers,
            method: "GET",
          })

          console.log(`Response status for ${range}:`, response.status)

          if (response.ok) {
            const data = await response.json()
            console.log(`Success with range ${range}:`, {
              range: data.range,
              majorDimension: data.majorDimension,
              valuesLength: data.values?.length || 0,
              firstRow: data.values?.[0]?.slice(0, 5) || [],
              secondRow: data.values?.[1]?.slice(0, 5) || [],
            })

            if (data.values && data.values.length > 0) {
              return NextResponse.json({
                success: true,
                data: data.values,
                range: data.range,
                method: `values API with range: ${range}`,
              })
            }
          } else {
            const errorText = await response.text()
            console.log(`Error for range ${range}:`, response.status, errorText)
          }
        } catch (error: any) {
          console.log(`Exception for range ${range}:`, error.message)
        }
      }

      // If values API failed, try with includeGridData
      console.log("=== TRYING GRID DATA API ===")
      try {
        const gridUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}&includeGridData=true`
        console.log("Grid URL:", gridUrl)

        const gridResponse = await fetch(gridUrl, {
          headers,
          method: "GET",
        })

        if (gridResponse.ok) {
          const gridData = await gridResponse.json()
          console.log("Grid data response:", {
            title: gridData.properties?.title,
            sheetsCount: gridData.sheets?.length || 0,
          })

          const targetSheet = gridData.sheets?.find((sheet: any) => sheet.properties?.title === sheetName)

          if (targetSheet?.data?.[0]?.rowData) {
            console.log("Found grid data for sheet")
            const rowData = targetSheet.data[0].rowData
            const extractedData = rowData
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

            console.log("Extracted grid data:", {
              rows: extractedData.length,
              firstRow: extractedData[0]?.slice(0, 5),
              secondRow: extractedData[1]?.slice(0, 5),
            })

            if (extractedData.length > 0) {
              return NextResponse.json({
                success: true,
                data: extractedData,
                method: "grid data API",
              })
            }
          }
        }
      } catch (gridError: any) {
        console.log("Grid data API error:", gridError.message)
      }

      return NextResponse.json(
        {
          error: "No data found",
          message: `Could not retrieve data for sheet "${sheetName}". The sheet might be empty or you might not have permission to access it.`,
        },
        { status: 404 },
      )
    }

    // Default: get spreadsheet info
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`
    console.log("Request URL:", url)

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

      // Provide specific guidance for HTTP referrer issues
      if (errorText.includes("API_KEY_HTTP_REFERRER_BLOCKED") || errorText.includes("referer")) {
        return NextResponse.json(
          {
            error: "HTTP Referrer Blocked",
            status: response.status,
            details: parsedError,
            rawError: errorText,
            solution: {
              problem:
                "A API Key do Google está configurada com restrições de HTTP Referrer que estão bloqueando as requisições do servidor.",
              steps: [
                "1. Acesse o Google Cloud Console: https://console.cloud.google.com/",
                "2. Vá para 'APIs e Serviços' > 'Credenciais'",
                "3. Clique na sua API Key",
                "4. Na seção 'Restrições da aplicação', escolha uma das opções:",
                "   OPÇÃO A (Recomendada): Selecione 'Nenhuma' para remover todas as restrições",
                "   OPÇÃO B: Em 'Referenciadores HTTP', adicione:",
                `   • ${origin}/*`,
                `   • ${origin}`,
                "   • https://acompanhamento.proxmox-carlos.com.br/*",
                "   • https://acompanhamento.proxmox-carlos.com.br",
                "5. Salve as alterações",
                "6. Aguarde alguns minutos para a propagação",
                "7. Tente novamente",
              ],
              currentOrigin: origin,
            },
          },
          { status: response.status },
        )
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
