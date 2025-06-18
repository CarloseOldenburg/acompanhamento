"use client"

import type { TabData, Column } from "../types"

// Tipos para a API do Google Sheets
interface GoogleSheetsResponse {
  values: string[][]
}

interface SheetInfo {
  properties: {
    title: string
    sheetId: number
    gridProperties: {
      rowCount: number
      columnCount: number
    }
  }
}

interface SpreadsheetInfo {
  properties: {
    title: string
  }
  sheets: SheetInfo[]
}

export class GoogleSheetsIntegration {
  private apiKey: string
  private accessToken: string | null = null

  constructor(apiKey: string) {
    this.apiKey = apiKey
    if (!apiKey) {
      console.warn("Google Sheets API key not provided")
    }
  }

  // Inicializar autenticação com Google
  async authenticate(): Promise<boolean> {
    try {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

      if (!clientId) {
        throw new Error("Client ID não configurado. Configure NEXT_PUBLIC_GOOGLE_CLIENT_ID.")
      }

      if (!this.apiKey) {
        throw new Error("API Key não configurada. Configure NEXT_PUBLIC_GOOGLE_API_KEY.")
      }

      // Verificar se a API do Google está carregada
      if (typeof window === "undefined" || !window.google || !window.google.accounts) {
        throw new Error("Google API não carregada. Verifique se o script foi carregado corretamente.")
      }

      // Get current origin for redirect URI
      const currentOrigin = window.location.origin

      // Usar o tokenClient para autenticação
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
        redirect_uri: currentOrigin, // Add current origin as redirect URI
        callback: (response: any) => {
          if (response.access_token) {
            this.accessToken = response.access_token
          }
        },
      })

      // Solicitar token
      return new Promise((resolve, reject) => {
        try {
          tokenClient.requestAccessToken({
            prompt: "consent",
            callback: (response: any) => {
              if (response && response.access_token) {
                this.accessToken = response.access_token
                resolve(true)
              } else if (response && response.error) {
                if (response.error === "redirect_uri_mismatch") {
                  reject(
                    new Error(
                      `redirect_uri_mismatch: Adicione ${currentOrigin} às URIs de redirecionamento autorizadas no Google Cloud Console`,
                    ),
                  )
                } else {
                  reject(new Error(`Erro OAuth: ${response.error}`))
                }
              } else {
                resolve(false)
              }
            },
          })
        } catch (error) {
          reject(error)
        }
      })
    } catch (error) {
      console.error("Erro na autenticação:", error)
      throw error // Re-throw to be handled by the calling function
    }
  }

  // Obter informações da planilha
  async getSpreadsheetInfo(spreadsheetId: string): Promise<SpreadsheetInfo> {
    if (!this.accessToken) {
      throw new Error("Não autenticado")
    }

    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${this.apiKey}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error("Erro ao acessar planilha")
    }

    return response.json()
  }

  // Obter dados de uma aba específica
  async getSheetData(spreadsheetId: string, sheetName: string): Promise<string[][]> {
    if (!this.accessToken) {
      throw new Error("Não autenticado")
    }

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}?key=${this.apiKey}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      },
    )

    if (!response.ok) {
      throw new Error("Erro ao obter dados da aba")
    }

    const data: GoogleSheetsResponse = await response.json()
    return data.values || []
  }

  // Converter dados do Google Sheets para formato do sistema
  convertToTabData(sheetName: string, data: string[][]): TabData {
    if (data.length === 0) {
      throw new Error("Planilha vazia")
    }

    const headers = data[0]
    const rows = data.slice(1)

    // Criar colunas baseadas nos cabeçalhos
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

    // Criar linhas de dados
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

  // Sanitizar chave para uso no sistema
  private sanitizeKey(text: string): string {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^a-z0-9]/g, "_") // Substitui caracteres especiais por _
      .replace(/_+/g, "_") // Remove _ duplicados
      .replace(/^_|_$/g, "") // Remove _ do início e fim
  }

  // Detectar tipo da coluna baseado no conteúdo
  private detectColumnType(header: string, values: string[]): Column["type"] {
    const headerLower = header.toLowerCase()

    // Detectar por nome da coluna
    if (headerLower.includes("data") || headerLower.includes("date")) {
      return "datetime"
    }

    if (headerLower.includes("status") || headerLower.includes("situacao")) {
      return "select"
    }

    // Detectar por conteúdo
    const nonEmptyValues = values.filter((v) => v.trim() !== "")
    if (nonEmptyValues.length === 0) return "text"

    // Se todos os valores são datas
    const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/
    if (nonEmptyValues.every((v) => datePattern.test(v))) {
      return "date"
    }

    // Se há poucos valores únicos, pode ser select
    const uniqueValues = [...new Set(nonEmptyValues)]
    if (uniqueValues.length <= 10 && uniqueValues.length > 1) {
      return "select"
    }

    return "text"
  }

  // Extrair opções para campos select
  private extractSelectOptions(values: string[]): string[] {
    const nonEmptyValues = values.filter((v) => v.trim() !== "")
    const uniqueValues = [...new Set(nonEmptyValues)]
    return uniqueValues.slice(0, 10) // Máximo 10 opções
  }

  // Estimar largura da coluna
  private estimateColumnWidth(header: string, values: string[]): number {
    const maxLength = Math.max(header.length, ...values.map((v) => v.length))

    // Largura base + largura por caractere
    const width = Math.min(Math.max(maxLength * 8 + 40, 100), 400)
    return width
  }

  // Extrair ID da planilha de uma URL
  static extractSpreadsheetId(url: string): string | null {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    return match ? match[1] : null
  }
}

// Adicionar tipagem para window.google
declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => any
        }
      }
    }
  }
}
