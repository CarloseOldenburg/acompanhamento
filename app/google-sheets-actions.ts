"use server"

import { headers } from "next/headers"
import type { TabData, Column } from "../types"
import { createTabAction } from "./actions"

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

      const encodedSheetName = encodeURIComponent(sheetName)
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedSheetName}?key=${this.apiKey}`
      console.log("Request URL:", url)

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

      console.log("Response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Sheet API Error Response:", errorText)

        let userFriendlyMessage = ""
        if (response.status === 403) {
          if (errorText.includes("API_KEY_HTTP_REFERRER_BLOCKED") || errorText.includes("referer")) {
            userFriendlyMessage = `
ERRO: HTTP Referrer Bloqueado

Para resolver, acesse o Google Cloud Console e remova as restrições de referrer da sua API Key.

Origem atual: ${origin}
            `
          } else {
            userFriendlyMessage = "Acesso negado à aba da planilha. Verifique as permissões."
          }
        } else if (response.status === 404) {
          userFriendlyMessage = `Aba "${sheetName}" não encontrada na planilha.`
        } else {
          userFriendlyMessage = `Erro ${response.status}: ${errorText}`
        }

        throw new Error(userFriendlyMessage)
      }

      const data = await response.json()
      console.log("Sheet data retrieved successfully")
      console.log("Number of rows:", data.values?.length || 0)
      console.log("=== getSheetData END ===")

      return data.values || []
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

      if (!data || data.length === 0) {
        throw new Error("Planilha vazia ou sem dados")
      }

      const headers = data[0]
      const rows = data.slice(1)

      console.log("Headers:", headers)
      console.log("Data rows count:", rows.length)

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
      console.log("=== convertToTabData END ===")
      return result
    } catch (error: any) {
      console.error("=== convertToTabData ERROR ===")
      console.error("Error message:", error.message)
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
    const result = await sheetsIntegration.getSheetData(spreadsheetId, sheetName, accessToken)
    console.log("=== SERVER ACTION: getSheetDataAction SUCCESS ===")
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
    const tabData = sheetsIntegration.convertToTabData(sheetName, data)
    const result = await createTabAction(tabData)
    console.log("=== SERVER ACTION: importGoogleSheetAction SUCCESS ===")
    return result
  } catch (error: any) {
    console.error("=== SERVER ACTION: importGoogleSheetAction ERROR ===")
    console.error("Error message:", error.message)
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
