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
    if (!this.apiKey) {
      throw new Error("Google API key not configured")
    }

    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${this.apiKey}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Erro ao acessar planilha: ${response.status} ${errorText}`)
    }

    return response.json()
  }

  // Get sheet data using access token
  async getSheetData(spreadsheetId: string, sheetName: string, accessToken: string) {
    if (!this.apiKey) {
      throw new Error("Google API key not configured")
    }

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}?key=${this.apiKey}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Erro ao obter dados da aba: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    return data.values || []
  }

  // Convert Google Sheets data to TabData format
  convertToTabData(sheetName: string, data: string[][]): TabData {
    if (data.length === 0) {
      throw new Error("Planilha vazia")
    }

    const headers = data[0]
    const rows = data.slice(1)

    // Create columns based on headers
    const columns: Column[] = headers.map((header, index) => {
      const key = this.sanitizeKey(header)
      const width = this.estimateColumnWidth(
        header,
        rows.map((row) => row[index] || ""),
      )

      return {
        key,
        label: header,
        type: this.detectColumnType(
          header,
          rows.map((row) => row[index] || ""),
        ),
        width,
        ...(this.detectColumnType(
          header,
          rows.map((row) => row[index] || ""),
        ) === "select" && {
          options: this.extractSelectOptions(rows.map((row) => row[index] || "")),
        }),
      }
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

    return {
      id: `imported-${this.sanitizeKey(sheetName)}-${Date.now()}`,
      name: sheetName,
      columns,
      rows: tabRows,
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
    const nonEmptyValues = values.filter((v) => v.trim() !== "")
    if (nonEmptyValues.length === 0) return "text"

    // If all values are dates
    const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/
    if (nonEmptyValues.every((v) => datePattern.test(v))) {
      return "date"
    }

    // If few unique values, might be select
    const uniqueValues = [...new Set(nonEmptyValues)]
    if (uniqueValues.length <= 10 && uniqueValues.length > 1) {
      return "select"
    }

    return "text"
  }

  // Extract options for select fields
  private extractSelectOptions(values: string[]): string[] {
    const nonEmptyValues = values.filter((v) => v.trim() !== "")
    const uniqueValues = [...new Set(nonEmptyValues)]
    return uniqueValues.slice(0, 10) // Max 10 options
  }

  // Estimate column width
  private estimateColumnWidth(header: string, values: string[]): number {
    const maxLength = Math.max(header.length, ...values.map((v) => v.length))

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
    return await sheetsIntegration.getSpreadsheetInfo(spreadsheetId, accessToken)
  } catch (error: any) {
    console.error("Error getting spreadsheet info:", error)
    throw new Error(error.message || "Erro ao acessar planilha")
  }
}

export async function getSheetDataAction(spreadsheetId: string, sheetName: string, accessToken: string) {
  try {
    return await sheetsIntegration.getSheetData(spreadsheetId, sheetName, accessToken)
  } catch (error: any) {
    console.error("Error getting sheet data:", error)
    throw new Error(error.message || "Erro ao obter dados da aba")
  }
}

export async function importGoogleSheetAction(sheetName: string, data: string[][]) {
  try {
    const tabData = sheetsIntegration.convertToTabData(sheetName, data)
    const result = await createTabAction(tabData)
    return result
  } catch (error: any) {
    console.error("Error importing sheet:", error)
    throw new Error(error.message || "Erro ao importar planilha")
  }
}

export function extractSpreadsheetIdAction(url: string) {
  return ServerGoogleSheetsIntegration.extractSpreadsheetId(url)
}

export async function checkGoogleApiConfigAction() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const apiKey = process.env.GOOGLE_API_KEY

  return {
    hasClientId: !!clientId,
    hasApiKey: !!apiKey,
    isConfigured: !!(clientId && apiKey),
  }
}
