"use server"

import type { TabData, Column } from "../types"
import { createTabAction } from "./actions"

// Server-side Google Sheets integration
class ServerGoogleSheetsIntegration {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY || ""
    if (!this.apiKey) {
      console.warn("Google Sheets API key not configured on server")
    }
  }

  // Get spreadsheet info using access token
  async getSpreadsheetInfo(spreadsheetId: string, accessToken: string) {
    try {
      console.log("Getting spreadsheet info for ID:", spreadsheetId)

      if (!this.apiKey) {
        throw new Error("Google API key not configured on server")
      }

      if (!accessToken) {
        throw new Error("Access token is required")
      }

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${this.apiKey}`
      console.log("Fetching from URL:", url)

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      })

      console.log("Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("API Error Response:", errorText)

        if (response.status === 403) {
          throw new Error(
            "Acesso negado. Verifique se a API do Google Sheets está habilitada e se as permissões estão corretas.",
          )
        } else if (response.status === 404) {
          throw new Error(
            "Planilha não encontrada. Verifique se o ID da planilha está correto e se você tem acesso a ela.",
          )
        } else {
          throw new Error(`Erro ao acessar planilha: ${response.status} - ${errorText}`)
        }
      }

      const data = await response.json()
      console.log("Spreadsheet info retrieved successfully")
      return data
    } catch (error: any) {
      console.error("Error in getSpreadsheetInfo:", error)
      throw error
    }
  }

  // Get sheet data using access token
  async getSheetData(spreadsheetId: string, sheetName: string, accessToken: string) {
    try {
      console.log("Getting sheet data for:", sheetName)

      if (!this.apiKey) {
        throw new Error("Google API key not configured on server")
      }

      if (!accessToken) {
        throw new Error("Access token is required")
      }

      const encodedSheetName = encodeURIComponent(sheetName)
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedSheetName}?key=${this.apiKey}`
      console.log("Fetching sheet data from URL:", url)

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      })

      console.log("Sheet data response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Sheet API Error Response:", errorText)

        if (response.status === 403) {
          throw new Error("Acesso negado à aba da planilha. Verifique as permissões.")
        } else if (response.status === 404) {
          throw new Error(`Aba "${sheetName}" não encontrada na planilha.`)
        } else {
          throw new Error(`Erro ao obter dados da aba: ${response.status} - ${errorText}`)
        }
      }

      const data = await response.json()
      console.log("Sheet data retrieved successfully, rows:", data.values?.length || 0)
      return data.values || []
    } catch (error: any) {
      console.error("Error in getSheetData:", error)
      throw error
    }
  }

  // Convert Google Sheets data to TabData format
  convertToTabData(sheetName: string, data: string[][]): TabData {
    try {
      console.log("Converting sheet data to TabData format")

      if (!data || data.length === 0) {
        throw new Error("Planilha vazia ou sem dados")
      }

      const headers = data[0]
      const rows = data.slice(1)

      console.log("Headers:", headers)
      console.log("Data rows:", rows.length)

      // Create columns based on headers
      const columns: Column[] = headers.map((header, index) => {
        const key = this.sanitizeKey(header)
        const width = this.estimateColumnWidth(
          header,
          rows.map((row) => row[index] || ""),
        )

        const columnType = this.detectColumnType(
          header,
          rows.map((row) => row[index] || ""),
        )

        const column: Column = {
          key,
          label: header,
          type: columnType,
          width,
        }

        if (columnType === "select") {
          column.options = this.extractSelectOptions(rows.map((row) => row[index] || ""))
        }

        return column
      })

      // Create data rows
      const tabRows = rows.map((row, index) => {
        const rowData: any = {
          id: `imported-${Date.now()}-${index}`,
        }

        headers.forEach((header, colIndex) => {
          const key = this.sanitizeKey(header)
          rowData[key] = row[colIndex] || ""
        })

        return rowData
      })

      const result: TabData = {
        id: `imported-${this.sanitizeKey(sheetName)}-${Date.now()}`,
        name: sheetName,
        columns,
        rows: tabRows,
      }

      console.log("TabData conversion completed successfully")
      return result
    } catch (error: any) {
      console.error("Error in convertToTabData:", error)
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

    // Detect by column name
    if (headerLower.includes("data") || headerLower.includes("date")) {
      return "datetime"
    }

    if (headerLower.includes("status") || headerLower.includes("situacao")) {
      return "select"
    }

    // Detect by content
    const nonEmptyValues = values.filter((v) => v && v.trim() !== "")
    if (nonEmptyValues.length === 0) return "text"

    // If all values are dates
    const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/
    if (nonEmptyValues.length > 0 && nonEmptyValues.every((v) => datePattern.test(v))) {
      return "date"
    }

    // If few unique values, might be select
    const uniqueValues = [...new Set(nonEmptyValues)]
    if (uniqueValues.length <= 10 && uniqueValues.length > 1 && nonEmptyValues.length > 5) {
      return "select"
    }

    return "text"
  }

  // Extract options for select fields
  private extractSelectOptions(values: string[]): string[] {
    const nonEmptyValues = values.filter((v) => v && v.trim() !== "")
    const uniqueValues = [...new Set(nonEmptyValues)]
    return uniqueValues.slice(0, 10) // Max 10 options
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
    console.log("Server action: getSpreadsheetInfoAction called")
    const result = await sheetsIntegration.getSpreadsheetInfo(spreadsheetId, accessToken)
    console.log("Server action: getSpreadsheetInfoAction completed successfully")
    return result
  } catch (error: any) {
    console.error("Server action error in getSpreadsheetInfoAction:", error)
    // Return a more user-friendly error
    throw new Error(error.message || "Erro ao acessar planilha do Google Sheets")
  }
}

export async function getSheetDataAction(spreadsheetId: string, sheetName: string, accessToken: string) {
  try {
    console.log("Server action: getSheetDataAction called")
    const result = await sheetsIntegration.getSheetData(spreadsheetId, sheetName, accessToken)
    console.log("Server action: getSheetDataAction completed successfully")
    return result
  } catch (error: any) {
    console.error("Server action error in getSheetDataAction:", error)
    throw new Error(error.message || "Erro ao obter dados da aba")
  }
}

export async function importGoogleSheetAction(sheetName: string, data: string[][]) {
  try {
    console.log("Server action: importGoogleSheetAction called")
    const tabData = sheetsIntegration.convertToTabData(sheetName, data)
    const result = await createTabAction(tabData)
    console.log("Server action: importGoogleSheetAction completed successfully")
    return result
  } catch (error: any) {
    console.error("Server action error in importGoogleSheetAction:", error)
    throw new Error(error.message || "Erro ao importar planilha")
  }
}

export async function extractSpreadsheetIdAction(url: string) {
  try {
    console.log("Server action: extractSpreadsheetIdAction called with URL:", url)
    const result = ServerGoogleSheetsIntegration.extractSpreadsheetId(url)
    console.log("Server action: extractSpreadsheetIdAction result:", result)
    return result
  } catch (error: any) {
    console.error("Server action error in extractSpreadsheetIdAction:", error)
    throw new Error("Erro ao extrair ID da planilha")
  }
}

export async function checkGoogleApiConfigAction() {
  try {
    console.log("Server action: checkGoogleApiConfigAction called")
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const apiKey = process.env.GOOGLE_API_KEY

    const result = {
      hasClientId: !!clientId,
      hasApiKey: !!apiKey,
      isConfigured: !!(clientId && apiKey),
    }

    console.log("Server action: checkGoogleApiConfigAction result:", {
      hasClientId: result.hasClientId,
      hasApiKey: result.hasApiKey,
      isConfigured: result.isConfigured,
    })

    return result
  } catch (error: any) {
    console.error("Server action error in checkGoogleApiConfigAction:", error)
    return {
      hasClientId: false,
      hasApiKey: false,
      isConfigured: false,
    }
  }
}
