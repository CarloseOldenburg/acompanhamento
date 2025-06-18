"use server"

import { headers } from "next/headers"
import type { TabData, Column } from "../types"
import { createTabAction, createRowAction } from "./actions"

// Server-side Google Sheets integration
class ServerGoogleSheetsIntegration {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY || ""
  }

  // Get the current request origin for referrer
  private async getCurrentOrigin(): Promise<string> {
    try {
      const headersList = await headers()
      const origin =
        headersList.get("origin") || headersList.get("referer") || "https://acompanhamento.proxmox-carlos.com.br"
      console.log("Current origin for referrer:", origin)
      return origin
    } catch (error) {
      console.log("Could not get headers, using default origin")
      return "https://acompanhamento.proxmox-carlos.com.br"
    }
  }

  // Get spreadsheet info using access token
  async getSpreadsheetInfo(spreadsheetId: string, accessToken: string) {
    try {
      console.log("=== getSpreadsheetInfo START ===")
      console.log("Spreadsheet ID:", spreadsheetId)
      console.log("Access token present:", !!accessToken)
      console.log("API key present:", !!this.apiKey)
      console.log("API key length:", this.apiKey.length)

      if (!this.apiKey) {
        const error = "Google API key not configured on server. Check GOOGLE_API_KEY environment variable."
        console.error(error)
        throw new Error(error)
      }

      if (!accessToken) {
        const error = "Access token is required"
        console.error(error)
        throw new Error(error)
      }

      if (!spreadsheetId) {
        const error = "Spreadsheet ID is required"
        console.error(error)
        throw new Error(error)
      }

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${this.apiKey}`
      console.log("Request URL:", url)

      // Get current origin for referrer
      const origin = await this.getCurrentOrigin()

      const headers = {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Referer: origin,
        Origin: origin,
        "User-Agent": "Mozilla/5.0 (compatible; NextJS-GoogleSheets/1.0)",
      }
      console.log("Request headers:", { ...headers, Authorization: "Bearer [REDACTED]" })

      const response = await fetch(url, {
        headers,
        method: "GET",
      })

      console.log("Response status:", response.status)
      console.log("Response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error("API Error Response:", errorText)

        let userFriendlyMessage = ""
        if (response.status === 403) {
          if (errorText.includes("API_KEY_HTTP_REFERRER_BLOCKED") || errorText.includes("referer")) {
            userFriendlyMessage = `
ERRO: HTTP Referrer Bloqueado

A API Key do Google está configurada com restrições de referrer que estão bloqueando as requisições.

SOLUÇÃO RÁPIDA:
1. Acesse: https://console.cloud.google.com/apis/credentials
2. Clique na sua API Key
3. Em "Restrições da aplicação", selecione "Nenhuma"
4. Salve e aguarde alguns minutos

SOLUÇÃO ALTERNATIVA:
1. Em "Referenciadores HTTP", adicione:
   • ${origin}/*
   • ${origin}
   • https://acompanhamento.proxmox-carlos.com.br/*
   • https://acompanhamento.proxmox-carlos.com.br

Origem atual detectada: ${origin}
            `
          } else {
            userFriendlyMessage =
              "Acesso negado. Verifique se a API do Google Sheets está habilitada e se as permissões estão corretas."
          }
        } else if (response.status === 404) {
          userFriendlyMessage =
            "Planilha não encontrada. Verifique se o ID da planilha está correto e se você tem acesso a ela."
        } else if (response.status === 401) {
          userFriendlyMessage = "Token de acesso inválido ou expirado. Tente fazer login novamente."
        } else {
          userFriendlyMessage = `Erro ${response.status}: ${errorText}`
        }

        throw new Error(userFriendlyMessage)
      }

      const data = await response.json()
      console.log("Spreadsheet info retrieved successfully")
      console.log("Spreadsheet title:", data.properties?.title)
      console.log("Number of sheets:", data.sheets?.length || 0)
      console.log("=== getSpreadsheetInfo END ===")

      return data
    } catch (error: any) {
      console.error("=== getSpreadsheetInfo ERROR ===")
      console.error("Error type:", error.constructor.name)
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
      console.error("=== getSpreadsheetInfo ERROR END ===")
      throw error
    }
  }

  // Get sheet data using access token
  async getSheetData(spreadsheetId: string, sheetName: string, accessToken: string) {
    try {
      console.log("=== getSheetData START ===")
      console.log("Spreadsheet ID:", spreadsheetId)
      console.log("Sheet name:", sheetName)
      console.log("Access token present:", !!accessToken)

      if (!this.apiKey) {
        throw new Error("Google API key not configured on server")
      }

      if (!accessToken) {
        throw new Error("Access token is required")
      }

      // Try different range formats to ensure we get all data
      const encodedSheetName = encodeURIComponent(sheetName)

      // First try to get all data with a large range
      const ranges = [
        `${encodedSheetName}!A:ZZ`, // All columns from A to ZZ
        `${encodedSheetName}!A1:ZZ1000`, // Specific range
        `${encodedSheetName}`, // Just the sheet name
        encodedSheetName, // Encoded sheet name only
      ]

      let data = null
      let successfulUrl = ""

      for (const range of ranges) {
        try {
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${this.apiKey}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`
          console.log(`Trying URL: ${url}`)

          // Get current origin for referrer
          const origin = await this.getCurrentOrigin()

          const response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              Referer: origin,
              Origin: origin,
              "User-Agent": "Mozilla/5.0 (compatible; NextJS-GoogleSheets/1.0)",
            },
            method: "GET",
          })

          console.log(`Response status for ${range}:`, response.status)

          if (response.ok) {
            const responseData = await response.json()
            console.log(`Response data for ${range}:`, {
              range: responseData.range,
              majorDimension: responseData.majorDimension,
              valuesLength: responseData.values?.length || 0,
              firstRowSample: responseData.values?.[0]?.slice(0, 3) || [],
              secondRowSample: responseData.values?.[1]?.slice(0, 3) || [],
            })

            if (responseData.values && responseData.values.length > 0) {
              data = responseData.values
              successfulUrl = url
              console.log(`✅ Successfully got data with range: ${range}`)
              break
            } else {
              console.log(`⚠️ No data returned for range: ${range}`)
            }
          } else {
            const errorText = await response.text()
            console.log(`❌ Error for range ${range}:`, response.status, errorText)
          }
        } catch (rangeError: any) {
          console.log(`❌ Exception for range ${range}:`, rangeError.message)
        }
      }

      if (!data) {
        console.error("❌ No data could be retrieved with any range format")

        // Try one more time with the basic API call to see what's available
        try {
          const basicUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${this.apiKey}&includeGridData=true`
          console.log("Trying basic spreadsheet info with grid data:", basicUrl)

          const origin = await this.getCurrentOrigin()
          const basicResponse = await fetch(basicUrl, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              Referer: origin,
              Origin: origin,
              "User-Agent": "Mozilla/5.0 (compatible; NextJS-GoogleSheets/1.0)",
            },
            method: "GET",
          })

          if (basicResponse.ok) {
            const basicData = await basicResponse.json()
            console.log("Basic spreadsheet data:", {
              title: basicData.properties?.title,
              sheets: basicData.sheets?.map((sheet: any) => ({
                title: sheet.properties?.title,
                rowCount: sheet.properties?.gridProperties?.rowCount,
                columnCount: sheet.properties?.gridProperties?.columnCount,
                hasData: !!sheet.data?.[0]?.rowData?.length,
              })),
            })

            // Try to extract data from the grid data
            const targetSheet = basicData.sheets?.find((sheet: any) => sheet.properties?.title === sheetName)

            if (targetSheet?.data?.[0]?.rowData) {
              console.log("Found grid data, extracting...")
              const gridData = targetSheet.data[0].rowData
              const extractedData = gridData
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

              if (extractedData.length > 0) {
                console.log("✅ Successfully extracted data from grid:", {
                  rows: extractedData.length,
                  firstRow: extractedData[0]?.slice(0, 3),
                  secondRow: extractedData[1]?.slice(0, 3),
                })
                data = extractedData
              }
            }
          }
        } catch (basicError: any) {
          console.error("Basic API call also failed:", basicError.message)
        }
      }

      if (!data || data.length === 0) {
        throw new Error(
          `Nenhum dado encontrado na aba "${sheetName}". Verifique se a aba contém dados e se você tem permissão para acessá-la.`,
        )
      }

      console.log("✅ Final sheet data retrieved successfully")
      console.log("Number of rows:", data.length)
      console.log("Number of columns in first row:", data[0]?.length || 0)
      console.log("First row (headers):", data[0]?.slice(0, 5) || [])
      console.log("Second row (first data):", data[1]?.slice(0, 5) || [])
      console.log("Successful URL:", successfulUrl)
      console.log("=== getSheetData END ===")

      return data
    } catch (error: any) {
      console.error("=== getSheetData ERROR ===")
      console.error("Error message:", error.message)
      console.error("=== getSheetData ERROR END ===")
      throw error
    }
  }

  // Convert Google Sheets data to TabData format
  convertToTabData(sheetName: string, data: string[][]): TabData {
    try {
      console.log("=== convertToTabData START ===")
      console.log("Sheet name:", sheetName)
      console.log("Data rows:", data.length)
      console.log("Raw data sample:", data.slice(0, 3))
      console.log("FULL RAW DATA:", data) // Log completo dos dados

      if (!data || data.length === 0) {
        throw new Error("Planilha vazia ou sem dados")
      }

      if (data.length === 1) {
        throw new Error("Planilha contém apenas cabeçalhos, sem dados para importar")
      }

      const headers = data[0]
      const rows = data.slice(1)

      console.log("Headers:", headers)
      console.log("Data rows count:", rows.length)
      console.log("First data row sample:", rows[0]?.slice(0, 3) || [])
      console.log("All rows sample:", rows.slice(0, 3))
      console.log("FULL ROWS DATA:", rows) // Log completo das linhas

      // Filter out completely empty rows - but be more lenient
      const filteredRows = rows.filter((row) => {
        // Check if row has any non-empty content
        const hasContent = row.some((cell) => {
          if (cell === null || cell === undefined) return false
          const cellStr = cell.toString().trim()
          return cellStr !== ""
        })
        console.log("Row filter check:", { row: row.slice(0, 3), hasContent, fullRow: row })
        return hasContent
      })

      console.log("Filtered rows count (non-empty):", filteredRows.length)
      console.log("Filtered rows sample:", filteredRows.slice(0, 3))
      console.log("FULL FILTERED ROWS:", filteredRows) // Log completo das linhas filtradas

      // Use filtered rows if we have them, otherwise use all rows
      const finalRows = filteredRows.length > 0 ? filteredRows : rows

      console.log("Final rows to process:", finalRows.length)
      console.log("Final rows sample:", finalRows.slice(0, 3))

      // Create columns based on headers
      const columns: Column[] = headers.map((header, index) => {
        const key = this.sanitizeKey(header)
        const width = this.estimateColumnWidth(
          header,
          finalRows.map((row) => row[index] || ""),
        )

        const columnType = this.detectColumnType(
          header,
          finalRows.map((row) => row[index] || ""),
        )

        const column: Column = {
          key,
          label: header,
          type: columnType,
          width,
        }

        if (columnType === "select") {
          column.options = this.extractSelectOptions(finalRows.map((row) => row[index] || ""))
        }

        console.log(`✅ Created column:`, column)
        return column
      })

      // Create data rows
      const tabRows = finalRows.map((row, index) => {
        const rowData: any = {
          id: `imported-${Date.now()}-${index}`,
        }

        headers.forEach((header, colIndex) => {
          const key = this.sanitizeKey(header)
          const cellValue = row[colIndex]
          // Convert null/undefined to empty string, but preserve other values
          rowData[key] = cellValue !== null && cellValue !== undefined ? cellValue.toString() : ""
          console.log(`Row ${index}, Column ${header} (${key}):`, cellValue, "->", rowData[key])
        })

        console.log(`✅ Created row ${index}:`, rowData)
        return rowData
      })

      const result: TabData = {
        id: `imported-${this.sanitizeKey(sheetName)}-${Date.now()}`,
        name: sheetName,
        columns,
        rows: tabRows,
      }

      console.log("✅ TabData conversion completed successfully")
      console.log(
        "Final columns:",
        columns.map((c) => c.label),
      )
      console.log("Final rows count:", tabRows.length)
      console.log("Sample row data:", tabRows[0])
      console.log("FULL RESULT:", result)
      console.log("=== convertToTabData END ===")
      return result
    } catch (error: any) {
      console.error("=== convertToTabData ERROR ===")
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
      console.error("=== convertToTabData ERROR END ===")
      throw error
    }
  }

  // Sanitize key for system use
  private sanitizeKey(text: string): string {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9]/g, "_") // Replace special chars with _
      .replace(/_+/g, "_") // Remove duplicate _
      .replace(/^_|_$/g, "") // Remove _ from start and end
  }

  // Detect column type based on content
  private detectColumnType(header: string, values: string[]): Column["type"] {
    const headerLower = header.toLowerCase()

    // Detect by column name - only specific fields should be select
    if (headerLower.includes("status") || headerLower === "status") {
      return "select"
    }

    // Date fields
    if (headerLower.includes("data") || headerLower.includes("date")) {
      return "datetime"
    }

    // Everything else should be text by default
    return "text"
  }

  // Extract options for select fields
  private extractSelectOptions(values: string[]): string[] {
    const nonEmptyValues = values.filter((v) => v && v.trim() !== "")
    const uniqueValues = [...new Set(nonEmptyValues)]

    // For status fields, return common status options
    return uniqueValues.length > 0 ? uniqueValues.slice(0, 10) : ["Pendente", "Agendado", "Concluido", "Cancelado"]
  }

  // Estimate column width
  private estimateColumnWidth(header: string, values: string[]): number {
    const maxLength = Math.max(header.length, ...values.map((v) => (v || "").length))
    // Base width + width per character
    const width = Math.min(Math.max(maxLength * 8 + 40, 100), 400)
    return width
  }

  // Extract spreadsheet ID from URL
  static extractSpreadsheetId(url: string): string | null {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    return match ? match[1] : null
  }
}

// Server actions for Google Sheets integration
const sheetsIntegration = new ServerGoogleSheetsIntegration()

export async function getSpreadsheetInfoAction(spreadsheetId: string, accessToken: string) {
  try {
    console.log("=== SERVER ACTION: getSpreadsheetInfoAction START ===")
    console.log("Received spreadsheet ID:", spreadsheetId)
    console.log("Received access token length:", accessToken?.length || 0)

    const result = await sheetsIntegration.getSpreadsheetInfo(spreadsheetId, accessToken)

    console.log("=== SERVER ACTION: getSpreadsheetInfoAction SUCCESS ===")
    return result
  } catch (error: any) {
    console.error("=== SERVER ACTION: getSpreadsheetInfoAction ERROR ===")
    console.error("Error type:", error.constructor.name)
    console.error("Error message:", error.message)
    console.error("Error stack:", error.stack)
    console.error("=== SERVER ACTION: getSpreadsheetInfoAction ERROR END ===")

    // Re-throw with original message to preserve user-friendly errors
    throw new Error(error.message || "Erro ao acessar planilha do Google Sheets")
  }
}

export async function getSheetDataAction(spreadsheetId: string, sheetName: string, accessToken: string) {
  try {
    console.log("=== SERVER ACTION: getSheetDataAction START ===")
    console.log("Received params:", { spreadsheetId, sheetName, tokenLength: accessToken?.length })

    const result = await sheetsIntegration.getSheetData(spreadsheetId, sheetName, accessToken)

    console.log("=== SERVER ACTION: getSheetDataAction SUCCESS ===")
    console.log("Returned data rows:", result?.length || 0)
    console.log("First row sample:", result?.[0]?.slice(0, 3) || [])

    return result
  } catch (error: any) {
    console.error("=== SERVER ACTION: getSheetDataAction ERROR ===")
    console.error("Error message:", error.message)
    console.error("=== SERVER ACTION: getSheetDataAction ERROR END ===")
    throw new Error(error.message || "Erro ao obter dados da aba")
  }
}

export async function importGoogleSheetAction(sheetName: string, data: string[][]) {
  try {
    console.log("=== SERVER ACTION: importGoogleSheetAction START ===")
    console.log("Sheet name:", sheetName)
    console.log("Data rows received:", data?.length || 0)
    console.log("First row sample:", data?.[0]?.slice(0, 3) || [])
    console.log("Second row sample:", data?.[1]?.slice(0, 3) || [])
    console.log("All data sample:", data?.slice(0, 3) || [])
    console.log("FULL DATA RECEIVED:", data) // Log completo dos dados recebidos

    // Convert data to TabData format
    const tabData = sheetsIntegration.convertToTabData(sheetName, data)

    console.log("✅ Converted TabData:")
    console.log("- ID:", tabData.id)
    console.log("- Name:", tabData.name)
    console.log("- Columns count:", tabData.columns.length)
    console.log("- Rows count:", tabData.rows.length)
    console.log("- Sample row:", tabData.rows[0])
    console.log("- FULL TAB DATA:", tabData) // Log completo do TabData

    // First create the tab (without rows)
    console.log("🚀 Step 1: Creating tab...")
    const tabResult = await createTabAction({
      id: tabData.id,
      name: tabData.name,
      columns: tabData.columns,
    })

    console.log("✅ Tab creation result:", tabResult)

    if (!tabResult.success) {
      throw new Error(`Failed to create tab: ${tabResult.error}`)
    }

    // Then create each row
    console.log("🚀 Step 2: Creating rows...")
    let successfulRows = 0
    let failedRows = 0

    for (let i = 0; i < tabData.rows.length; i++) {
      const row = tabData.rows[i]
      console.log(`Creating row ${i + 1}/${tabData.rows.length}:`, row)

      try {
        const rowResult = await createRowAction(tabData.id, row)
        console.log(`Row ${i + 1} result:`, rowResult)

        if (rowResult.success) {
          successfulRows++
        } else {
          failedRows++
          console.error(`Failed to create row ${i + 1}:`, rowResult.error)
        }
      } catch (rowError: any) {
        failedRows++
        console.error(`Exception creating row ${i + 1}:`, rowError.message)
      }
    }

    console.log("✅ Row creation summary:")
    console.log(`- Successful rows: ${successfulRows}`)
    console.log(`- Failed rows: ${failedRows}`)
    console.log(`- Total rows: ${tabData.rows.length}`)

    if (successfulRows === 0) {
      throw new Error("Failed to create any rows")
    }

    console.log("=== SERVER ACTION: importGoogleSheetAction SUCCESS ===")
    console.log(`Created tab with ${successfulRows} rows (${failedRows} failed)`)

    return {
      success: true,
      tabId: tabData.id,
      rowsCreated: successfulRows,
      rowsFailed: failedRows,
    }
  } catch (error: any) {
    console.error("=== SERVER ACTION: importGoogleSheetAction ERROR ===")
    console.error("Error message:", error.message)
    console.error("Error stack:", error.stack)
    console.error("=== SERVER ACTION: importGoogleSheetAction ERROR END ===")
    throw new Error(error.message || "Erro ao importar planilha")
  }
}

export async function extractSpreadsheetIdAction(url: string) {
  try {
    console.log("=== SERVER ACTION: extractSpreadsheetIdAction START ===")
    console.log("URL received:", url)
    const result = ServerGoogleSheetsIntegration.extractSpreadsheetId(url)
    console.log("Extracted ID:", result)
    console.log("=== SERVER ACTION: extractSpreadsheetIdAction SUCCESS ===")
    return result
  } catch (error: any) {
    console.error("=== SERVER ACTION: extractSpreadsheetIdAction ERROR ===")
    console.error("Error message:", error.message)
    console.error("=== SERVER ACTION: extractSpreadsheetIdAction ERROR END ===")
    throw new Error("Erro ao extrair ID da planilha")
  }
}

export async function checkGoogleApiConfigAction() {
  try {
    console.log("=== SERVER ACTION: checkGoogleApiConfigAction START ===")

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const apiKey = process.env.GOOGLE_API_KEY

    console.log("Environment check:")
    console.log("- NEXT_PUBLIC_GOOGLE_CLIENT_ID present:", !!clientId)
    console.log("- NEXT_PUBLIC_GOOGLE_CLIENT_ID length:", clientId?.length || 0)
    console.log("- GOOGLE_API_KEY present:", !!apiKey)
    console.log("- GOOGLE_API_KEY length:", apiKey?.length || 0)

    const result = {
      hasClientId: !!clientId,
      hasApiKey: !!apiKey,
      isConfigured: !!(clientId && apiKey),
      clientIdLength: clientId?.length || 0,
      apiKeyLength: apiKey?.length || 0,
    }

    console.log("Config result:", result)
    console.log("=== SERVER ACTION: checkGoogleApiConfigAction SUCCESS ===")

    return result
  } catch (error: any) {
    console.error("=== SERVER ACTION: checkGoogleApiConfigAction ERROR ===")
    console.error("Error message:", error.message)
    console.error("=== SERVER ACTION: checkGoogleApiConfigAction ERROR END ===")
    return {
      hasClientId: false,
      hasApiKey: false,
      isConfigured: false,
      clientIdLength: 0,
      apiKeyLength: 0,
    }
  }
}
