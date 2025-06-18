"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { FileSpreadsheet, Download, CheckCircle, AlertTriangle, Clock, Bug, ExternalLink, Search } from "lucide-react"
import { toast } from "sonner"
import { ClientGoogleAuth } from "../lib/client-google-auth"
import { LoadingSpinner } from "./loading-spinner"
import type { TabData } from "../types"
import {
  getSpreadsheetInfoAction,
  getSheetDataAction,
  importGoogleSheetAction,
  extractSpreadsheetIdAction,
  checkGoogleApiConfigAction,
} from "../app/google-sheets-actions"

interface GoogleSheetsImportProps {
  onImportComplete: () => void
}

export function GoogleSheetsImport({ onImportComplete }: GoogleSheetsImportProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<"url" | "auth" | "sheets" | "preview" | "importing">("url")
  const [spreadsheetUrl, setSpreadsheetUrl] = useState("")
  const [spreadsheetInfo, setSpreadsheetInfo] = useState<any>(null)
  const [selectedSheet, setSelectedSheet] = useState<string>("")
  const [previewData, setPreviewData] = useState<TabData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [googleAuth] = useState(() => new ClientGoogleAuth())
  const [apiConfig, setApiConfig] = useState<any>(null)
  const [authTimeout, setAuthTimeout] = useState<NodeJS.Timeout | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [debugResults, setDebugResults] = useState<any>(null)
  const [importProgress, setImportProgress] = useState<string>("")

  // Debug database function
  const debugDatabase = async () => {
    try {
      const response = await fetch("/api/debug-database")
      const data = await response.json()
      console.log("Database debug:", data)

      if (data.success) {
        toast.success(`Database OK: ${data.counts.tabs} tabs, ${data.counts.rows} rows`)
      } else {
        toast.error(`Database error: ${data.error}`)
      }
    } catch (error) {
      console.error("Debug database error:", error)
      toast.error("Erro ao verificar banco de dados")
    }
  }

  // Fix hydration issue and check API configuration
  useEffect(() => {
    setMounted(true)
    checkGoogleApiConfigAction().then((config) => {
      setApiConfig(config)
      setDebugInfo(config)
    })
  }, [])

  // Test server configuration
  const testServerConfig = async () => {
    try {
      const response = await fetch("/api/test-google-config")
      const data = await response.json()
      setDebugInfo(data)
      console.log("Server config test:", data)
    } catch (error) {
      console.error("Error testing server config:", error)
    }
  }

  // Debug sheet data specifically
  const debugSheetData = async (spreadsheetId: string, sheetName: string, accessToken: string) => {
    try {
      console.log("=== DEBUGGING SHEET DATA ===")
      const response = await fetch("/api/debug-sheet-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          spreadsheetId,
          sheetName,
          accessToken,
        }),
      })

      const result = await response.json()
      console.log("Sheet data debug result:", result)
      setDebugResults(result)

      // Log detailed results for debugging
      if (result.success && result.results) {
        console.log("=== DETAILED DEBUG RESULTS ===")
        result.results.forEach((r: any, i: number) => {
          console.log(`Method ${i + 1}: ${r.method}`)
          console.log(`  Success: ${r.success}`)
          console.log(`  Data length: ${r.dataLength || 0}`)
          console.log(`  Full data length: ${r.fullData?.length || 0}`)
          console.log(`  First row: ${JSON.stringify(r.firstRow?.slice(0, 3) || [])}`)
          console.log(`  Second row: ${JSON.stringify(r.secondRow?.slice(0, 3) || [])}`)
          if (r.error) console.log(`  Error: ${r.error}`)
          console.log("---")
        })
        console.log("=== END DETAILED DEBUG RESULTS ===")
      }

      if (result.success && result.summary?.bestResult) {
        const bestResult = result.summary.bestResult
        console.log("=== USING BEST RESULT ===")
        console.log("Best method:", bestResult.method)
        console.log("Full data length:", bestResult.fullData?.length || 0)
        console.log("Sample data:", bestResult.fullData?.slice(0, 3) || [])

        if (bestResult.fullData && bestResult.fullData.length > 0) {
          return bestResult.fullData
        }
      }

      throw new Error(`Nenhum método conseguiu obter dados da aba "${sheetName}". Verifique se a aba contém dados.`)
    } catch (error: any) {
      console.error("Sheet data debug error:", error)
      throw error
    }
  }

  // Debug Google Sheets API directly
  const debugGoogleSheetsAPI = async (spreadsheetId: string, accessToken: string) => {
    try {
      console.log("=== DEBUGGING GOOGLE SHEETS API ===")
      const response = await fetch("/api/debug-google-sheets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          spreadsheetId,
          accessToken,
        }),
      })

      const result = await response.json()
      console.log("Debug API result:", result)

      if (result.success) {
        return result.data
      } else {
        // If it's a referrer error, throw with solution
        if (result.error === "HTTP Referrer Blocked" && result.solution) {
          const error = new Error("HTTP_REFERRER_BLOCKED")
          error.solution = result.solution
          throw error
        }
        throw new Error(result.error || "Debug API failed")
      }
    } catch (error: any) {
      console.error("Debug API error:", error)
      throw error
    }
  }

  const handleUrlSubmit = async () => {
    setError(null)

    if (!apiConfig?.isConfigured) {
      const missingVars = []
      if (!apiConfig?.hasClientId) missingVars.push("NEXT_PUBLIC_GOOGLE_CLIENT_ID")
      if (!apiConfig?.hasApiKey) missingVars.push("GOOGLE_API_KEY")

      setError(`Configuração do Google API não encontrada. Variáveis necessárias: ${missingVars.join(", ")}`)
      toast.error("Google API não configurado. Verifique as variáveis de ambiente.")
      return
    }

    const spreadsheetId = await extractSpreadsheetIdAction(spreadsheetUrl)
    if (!spreadsheetId) {
      toast.error("URL inválida. Use uma URL do Google Sheets.")
      return
    }

    console.log("Extracted spreadsheet ID:", spreadsheetId)

    setStep("auth")

    // Set timeout for authentication
    const timeout = setTimeout(() => {
      setError("Timeout na autenticação. A janela de autorização pode ter sido bloqueada ou fechada.")
      setStep("url")
      toast.error("Timeout na autenticação. Tente novamente.")
    }, 45000) // 45 seconds

    setAuthTimeout(timeout)

    try {
      console.log("Starting authentication...")
      const accessToken = await googleAuth.authenticate()

      // Clear timeout on success
      if (authTimeout) {
        clearTimeout(authTimeout)
        setAuthTimeout(null)
      }

      if (!accessToken) {
        throw new Error("Falha na autenticação com Google")
      }

      console.log("Authentication successful, access token length:", accessToken.length)
      console.log("Fetching spreadsheet info...")

      try {
        // First try the debug endpoint to get detailed error information
        console.log("=== TRYING DEBUG ENDPOINT FIRST ===")
        const debugResult = await debugGoogleSheetsAPI(spreadsheetId, accessToken)
        console.log("Debug endpoint success:", debugResult)

        // If debug works, convert to expected format
        const spreadsheetInfo = {
          properties: { title: debugResult.title },
          sheets: debugResult.sheets.map((sheet: any) => ({
            properties: {
              sheetId: sheet.id,
              title: sheet.title,
              gridProperties: {
                rowCount: sheet.rowCount,
                columnCount: sheet.columnCount,
              },
            },
          })),
        }

        setSpreadsheetInfo(spreadsheetInfo)
        setStep("sheets")
      } catch (debugError: any) {
        console.error("Debug endpoint failed, trying server action:", debugError)

        // Handle HTTP referrer blocked error specifically
        if (debugError.message === "HTTP_REFERRER_BLOCKED" && debugError.solution) {
          setError(`
🚫 ERRO: HTTP Referrer Bloqueado

${debugError.solution.problem}

📋 INSTRUÇÕES PARA RESOLVER:

${debugError.solution.steps.join("\n")}

🌐 Origem atual detectada: ${debugError.solution.currentOrigin}

💡 DICA: A opção mais simples é remover todas as restrições da API Key (Opção A).
          `)
          setStep("url")
          toast.error("Erro de configuração da API Key. Verifique as instruções abaixo.")
          return
        }

        // If debug fails, try the original server action
        try {
          const info = await getSpreadsheetInfoAction(spreadsheetId, accessToken)
          console.log("Server action success:", info)
          setSpreadsheetInfo(info)
          setStep("sheets")
        } catch (serverActionError: any) {
          console.error("Server action also failed:", serverActionError)

          // Check if server action error also mentions referrer
          if (
            serverActionError.message.includes("HTTP Referrer Bloqueado") ||
            serverActionError.message.includes("referrer")
          ) {
            setError(`
🚫 ERRO: HTTP Referrer Bloqueado

A API Key do Google está configurada com restrições de HTTP Referrer que estão bloqueando as requisições do servidor.

📋 SOLUÇÃO RÁPIDA:
1. Acesse: https://console.cloud.google.com/apis/credentials
2. Clique na sua API Key do Google Sheets
3. Na seção "Restrições da aplicação", selecione "Nenhuma"
4. Clique em "Salvar"
5. Aguarde alguns minutos para a propagação
6. Tente novamente

📋 SOLUÇÃO ALTERNATIVA (Mais Segura):
1. Em "Restrições da aplicação", mantenha "Referenciadores HTTP"
2. Na lista "Referenciadores HTTP", adicione:
   • https://acompanhamento.proxmox-carlos.com.br/*
   • https://acompanhamento.proxmox-carlos.com.br
3. Salve e aguarde alguns minutos

🌐 URL da planilha: ${spreadsheetUrl}
🆔 ID extraído: ${spreadsheetId}
            `)
          } else {
            setError(`
❌ Erro ao acessar planilha:

${serverActionError.message}

🔍 INFORMAÇÕES DE DEBUG:
- URL: ${spreadsheetUrl}
- ID: ${spreadsheetId}
- Token: ${accessToken ? "Presente" : "Ausente"}
- Token length: ${accessToken?.length || 0}
- Client ID: ${apiConfig?.hasClientId ? "Configurado" : "Não configurado"}
- API Key: ${apiConfig?.hasApiKey ? "Configurado" : "Não configurado"}
            `)
          }

          setStep("url")
          toast.error("Erro ao acessar planilha. Verifique as instruções abaixo.")
        }
      }
    } catch (error: any) {
      console.error("Erro na autenticação:", error)

      // Clear timeout on error
      if (authTimeout) {
        clearTimeout(authTimeout)
        setAuthTimeout(null)
      }

      // Handle specific OAuth errors with detailed instructions
      if (error.message.includes("redirect_uri_mismatch")) {
        setError(`
🚫 Erro de configuração OAuth: redirect_uri_mismatch

📋 INSTRUÇÕES PARA RESOLVER:

1. Acesse: https://console.cloud.google.com/
2. Vá para "APIs e Serviços" > "Credenciais"
3. Clique na sua credencial OAuth 2.0
4. Na seção "URIs de redirecionamento autorizados", adicione:

• ${mounted ? window.location.origin : "https://seu-dominio.com"}
• ${mounted ? window.location.origin + "/" : "https://seu-dominio.com/"}
• http://localhost:3000
• https://localhost:3000

5. Salve e aguarde alguns minutos
6. Tente novamente

🌐 Domínio atual: ${mounted ? window.location.origin : "Carregando..."}
        `)
      } else {
        setError(error.message || "Erro ao acessar planilha")
      }

      setStep("url")
      toast.error("Erro na autenticação. Verifique as instruções abaixo.")
    }
  }

  const handleSheetSelect = async (sheetName: string) => {
    setSelectedSheet(sheetName)

    try {
      const spreadsheetId = await extractSpreadsheetIdAction(spreadsheetUrl)
      const accessToken = googleAuth.getAccessToken()

      if (!accessToken) {
        throw new Error("Token de acesso não encontrado")
      }

      console.log("=== GETTING SHEET DATA ===")
      console.log("Sheet name:", sheetName)
      console.log("Spreadsheet ID:", spreadsheetId)

      // First try the debug endpoint to see all methods
      try {
        console.log("Trying debug sheet data endpoint...")
        const debugData = await debugSheetData(spreadsheetId, sheetName, accessToken)

        if (debugData && debugData.length > 0) {
          console.log("✅ Debug endpoint returned data:", debugData.length, "rows")
          console.log("Full data preview:", debugData.slice(0, 3))

          // Convert to preview format
          const headers = debugData[0]
          const rows = debugData.slice(1)

          const previewTabData: TabData = {
            id: `preview-${Date.now()}`,
            name: sheetName,
            columns: headers.map((header, index) => ({
              key: header.toLowerCase().replace(/[^a-z0-9]/g, "_"),
              label: header,
              type: "text" as const,
              width: 150,
            })),
            rows: rows.slice(0, 5).map((row, index) => {
              const rowData: any = { id: `preview-${index}` }
              headers.forEach((header, colIndex) => {
                const key = header.toLowerCase().replace(/[^a-z0-9]/g, "_")
                rowData[key] = row[colIndex] || ""
              })
              return rowData
            }),
          }

          setPreviewData(previewTabData)
          setStep("preview")
          return
        }
      } catch (debugError: any) {
        console.error("Debug endpoint failed:", debugError.message)
      }

      // Fallback to original server action
      console.log("Trying original server action...")
      const data = await getSheetDataAction(spreadsheetId, sheetName, accessToken)

      console.log("Server action returned:", data?.length || 0, "rows")

      // Convert the server response back to preview format
      if (data && data.length > 0) {
        const headers = data[0]
        const rows = data.slice(1)

        const previewTabData: TabData = {
          id: `preview-${Date.now()}`,
          name: sheetName,
          columns: headers.map((header, index) => ({
            key: header.toLowerCase().replace(/[^a-z0-9]/g, "_"),
            label: header,
            type: "text" as const,
            width: 150,
          })),
          rows: rows.slice(0, 5).map((row, index) => {
            const rowData: any = { id: `preview-${index}` }
            headers.forEach((header, colIndex) => {
              const key = header.toLowerCase().replace(/[^a-z0-9]/g, "_")
              rowData[key] = row[colIndex] || ""
            })
            return rowData
          }),
        }

        setPreviewData(previewTabData)
        setStep("preview")
      } else {
        throw new Error("Nenhum dado encontrado na aba selecionada")
      }
    } catch (error: any) {
      console.error("Error loading sheet data:", error)
      toast.error(error.message || "Erro ao carregar dados da aba")

      // Show debug results if available
      if (debugResults) {
        console.log("Debug results available:", debugResults)
        setError(`
❌ Erro ao carregar dados da aba "${sheetName}"

${error.message}

🔍 RESULTADOS DO DEBUG:
${
  debugResults.results
    ?.map((r: any, i: number) => `${i + 1}. ${r.method}: ${r.success ? "✅" : "❌"} (${r.dataLength || 0} linhas)`)
    .join("\n") || "Nenhum resultado disponível"
}

📊 RESUMO:
- Métodos testados: ${debugResults.summary?.totalMethods || 0}
- Métodos bem-sucedidos: ${debugResults.summary?.successfulMethods || 0}
- Métodos com dados: ${debugResults.summary?.methodsWithData || 0}
- Máximo de dados encontrados: ${debugResults.summary?.maxDataLength || 0}

💡 DICA: Verifique se a aba "${sheetName}" contém dados e se você tem permissão para acessá-la.
        `)
      }
    }
  }

  const handleImport = async () => {
    if (!previewData) return

    setStep("importing")
    setImportProgress("Iniciando importação...")

    try {
      const spreadsheetId = await extractSpreadsheetIdAction(spreadsheetUrl)
      const accessToken = googleAuth.getAccessToken()

      if (!accessToken) {
        throw new Error("Token de acesso não encontrado")
      }

      setImportProgress("Obtendo dados completos da planilha...")

      // Try debug endpoint first for full data
      let data = null
      try {
        data = await debugSheetData(spreadsheetId, selectedSheet, accessToken)
        console.log("Using debug endpoint data for import:", data?.length || 0, "rows")
        console.log("Data preview:", {
          totalRows: data.length,
          headers: data[0],
          firstDataRow: data[1],
          sampleData: data.slice(0, 3),
          allData: data, // Log all data for debugging
        })
      } catch (debugError) {
        console.log("Debug endpoint failed, using server action...")
        data = await getSheetDataAction(spreadsheetId, selectedSheet, accessToken)
        console.log("Using server action data for import:", data?.length || 0, "rows")
      }

      if (!data || data.length === 0) {
        throw new Error("Nenhum dado encontrado para importar")
      }

      setImportProgress(`Criando aba e inserindo ${data.length - 1} registros...`)

      const result = await importGoogleSheetAction(selectedSheet, data)

      console.log("Import result:", result)

      if (result.success) {
        let message = `Aba "${selectedSheet}" importada com sucesso! ${result.rowsCreated} registros criados.`
        if (result.rowsFailed > 0) {
          message += ` (${result.rowsFailed} registros falharam)`
        }
        toast.success(message)
        setIsOpen(false)
        onImportComplete()
        resetState()
      } else {
        console.error("Import failed:", result)
        throw new Error(result.error || "Falha na importação")
      }
    } catch (error: any) {
      console.error("Import error:", error)
      toast.error(error.message || "Erro ao importar dados")
      setStep("preview")
    }
  }

  const resetState = () => {
    setStep("url")
    setSpreadsheetUrl("")
    setSpreadsheetInfo(null)
    setSelectedSheet("")
    setPreviewData(null)
    setError(null)
    setDebugResults(null)
    setImportProgress("")
    if (authTimeout) {
      clearTimeout(authTimeout)
      setAuthTimeout(null)
    }
  }

  const renderStepContent = () => {
    switch (step) {
      case "url":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="spreadsheet-url">URL da Planilha do Google Sheets</Label>
              <Input
                id="spreadsheet-url"
                value={spreadsheetUrl}
                onChange={(e) => setSpreadsheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">Cole a URL completa da sua planilha do Google Sheets</p>
            </div>

            {/* Debug Info */}
            {debugInfo && (
              <div className="text-xs bg-gray-50 p-3 rounded border">
                <div className="flex items-center gap-2 mb-2">
                  <Bug className="w-4 h-4" />
                  <span className="font-medium">Informações de Debug</span>
                  <Button variant="outline" size="sm" onClick={testServerConfig}>
                    Testar Config
                  </Button>
                  <Button variant="outline" size="sm" onClick={debugDatabase}>
                    Debug Database
                  </Button>
                </div>
                <div className="space-y-1">
                  <div>Client ID: {debugInfo.hasClientId ? "✅ Configurado" : "❌ Não configurado"}</div>
                  <div>API Key: {debugInfo.hasApiKey ? "✅ Configurado" : "❌ Não configurado"}</div>
                  <div>Client ID Length: {debugInfo.clientIdLength || 0}</div>
                  <div>API Key Length: {debugInfo.apiKeyLength || 0}</div>
                </div>
              </div>
            )}

            {/* Debug Results */}
            {debugResults && (
              <div className="text-xs bg-blue-50 p-3 rounded border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-800">Resultados do Debug</span>
                </div>
                <div className="space-y-1 text-blue-700">
                  <div>Planilha: {debugResults.spreadsheetId}</div>
                  <div>Aba: {debugResults.sheetName}</div>
                  <div>Métodos testados: {debugResults.summary?.totalMethods || 0}</div>
                  <div>Métodos com sucesso: {debugResults.summary?.successfulMethods || 0}</div>
                  <div>Métodos com dados: {debugResults.summary?.methodsWithData || 0}</div>
                  <div>Máximo de dados: {debugResults.summary?.maxDataLength || 0}</div>
                  {debugResults.summary?.bestResult && (
                    <div className="mt-2 p-2 bg-green-100 rounded">
                      <div className="font-medium text-green-800">✅ Melhor resultado:</div>
                      <div className="text-green-700">
                        Método: {debugResults.summary.bestResult.method}
                        <br />
                        Linhas: {debugResults.summary.bestResult.dataLength}
                        <br />
                        Dados completos: {debugResults.summary.bestResult.fullData?.length || 0}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-500 p-4 bg-red-50 rounded-md border border-red-200 max-h-80 overflow-y-auto">
                <div className="flex items-center gap-2 font-medium mb-3">
                  <AlertTriangle className="w-5 h-5" />
                  Erro de Configuração
                </div>
                <div className="mb-4 whitespace-pre-line font-mono text-xs leading-relaxed">{error}</div>

                {error.includes("HTTP Referrer Bloqueado") && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
                      <ExternalLink className="w-4 h-4" />
                      Link Rápido
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open("https://console.cloud.google.com/apis/credentials", "_blank")}
                      className="text-blue-700 border-blue-300 hover:bg-blue-100"
                    >
                      Abrir Google Cloud Console
                    </Button>
                  </div>
                )}

                <div className="text-xs space-y-1 mt-4 pt-3 border-t border-red-200">
                  <div className="font-medium">Configuração Geral do Google Sheets:</div>
                  <div>1. Acesse o Google Cloud Console</div>
                  <div>2. Crie um projeto e ative a Google Sheets API</div>
                  <div>3. Configure as credenciais OAuth 2.0</div>
                  <div>4. Configure a API Key sem restrições ou com referrer correto</div>
                  <div>5. Adicione as variáveis de ambiente no seu projeto</div>
                </div>
              </div>
            )}

            <Button onClick={handleUrlSubmit} className="w-full" disabled={!spreadsheetUrl.trim()}>
              Conectar Planilha
            </Button>

            {mounted && !apiConfig?.isConfigured && (
              <div className="text-xs text-amber-600 p-2 bg-amber-50 rounded-md border border-amber-200">
                ⚠️ Google API não configurado. Esta funcionalidade requer configuração adicional.
              </div>
            )}
          </div>
        )

      case "auth":
        return (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <div className="relative">
                <LoadingSpinner size="lg" />
                <Clock className="w-6 h-6 text-blue-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
            </div>
            <div>
              <p className="font-medium">Autenticando com Google...</p>
              <p className="text-sm text-gray-500 mt-2">
                Uma janela de autorização será aberta. Permita o acesso às suas planilhas.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Se a janela não abrir, verifique se o bloqueador de pop-ups está desabilitado.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                if (authTimeout) {
                  clearTimeout(authTimeout)
                  setAuthTimeout(null)
                }
                setStep("url")
              }}
              className="mt-4"
            >
              Cancelar
            </Button>
          </div>
        )

      case "sheets":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Planilha: {spreadsheetInfo?.properties?.title}</h3>
              <p className="text-sm text-gray-500 mb-4">Selecione a aba que deseja importar:</p>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {spreadsheetInfo?.sheets?.map((sheet: any) => (
                <Card
                  key={sheet.properties.sheetId}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleSheetSelect(sheet.properties.title)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{sheet.properties.title}</h4>
                        <p className="text-sm text-gray-500">
                          {sheet.properties.gridProperties.rowCount} linhas ×{" "}
                          {sheet.properties.gridProperties.columnCount} colunas
                        </p>
                      </div>
                      <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )

      case "preview":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Preview: {previewData?.name}</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>{previewData?.columns.length} colunas</span>
                <span>{previewData?.rows.length}+ registros (preview)</span>
                {debugResults?.summary?.maxDataLength && (
                  <span className="text-green-600 font-medium">
                    Total: {debugResults.summary.maxDataLength - 1} registros
                  </span>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-2">Colunas detectadas:</h4>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {previewData?.columns.map((col) => (
                  <div key={col.key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm font-medium">{col.label}</span>
                    <Badge variant={col.type === "select" ? "default" : "secondary"}>{col.type}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-2">Primeiros registros:</h4>
              <div className="max-h-40 overflow-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {previewData?.columns.slice(0, 3).map((col) => (
                        <th key={col.key} className="p-2 text-left font-medium">
                          {col.label}
                        </th>
                      ))}
                      {previewData && previewData.columns.length > 3 && (
                        <th className="p-2 text-left font-medium">...</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData?.rows.slice(0, 3).map((row, index) => (
                      <tr key={index} className="border-t">
                        {previewData.columns.slice(0, 3).map((col) => (
                          <td key={col.key} className="p-2 truncate max-w-32">
                            {row[col.key] || "-"}
                          </td>
                        ))}
                        {previewData.columns.length > 3 && <td className="p-2 text-gray-400">...</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => setStep("sheets")} className="flex-1">
                Voltar
              </Button>
              <Button onClick={handleImport} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Importar Dados
              </Button>
            </div>
          </div>
        )

      case "importing":
        return (
          <div className="text-center space-y-4">
            <LoadingSpinner size="lg" />
            <p>Importando dados...</p>
            <p className="text-sm text-gray-500">{importProgress}</p>
          </div>
        )

      default:
        return null
    }
  }

  // Show consistent loading state during hydration
  if (!mounted) {
    return (
      <Button
        variant="outline"
        disabled
        className="border-2 border-dashed border-gray-300 text-gray-400 cursor-not-allowed"
        suppressHydrationWarning
      >
        <FileSpreadsheet className="w-4 h-4 mr-2" />
        Carregando...
      </Button>
    )
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) resetState()
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-2 border-dashed border-green-300 hover:border-green-500 hover:bg-green-50 text-green-600 hover:text-green-700"
          suppressHydrationWarning
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Importar do Google Sheets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            <span>Importar do Google Sheets</span>
          </DialogTitle>
          <DialogDescription>
            Importe dados diretamente de uma planilha do Google Sheets para o sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4" suppressHydrationWarning>
          {/* Progress indicator */}
          <div className="flex items-center justify-center space-x-2 mb-6">
            {["url", "auth", "sheets", "preview", "importing"].map((stepName, index) => (
              <div key={stepName} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === stepName
                      ? "bg-blue-600 text-white"
                      : ["url", "auth", "sheets", "preview"].indexOf(step) > index
                        ? "bg-green-600 text-white"
                        : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {["url", "auth", "sheets", "preview"].indexOf(step) > index ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < 4 && <div className="w-8 h-0.5 bg-gray-200 mx-1" />}
              </div>
            ))}
          </div>

          {renderStepContent()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
