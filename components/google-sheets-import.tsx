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
import { FileSpreadsheet, Download, CheckCircle, AlertTriangle, Clock } from "lucide-react"
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

  // Fix hydration issue and check API configuration
  useEffect(() => {
    setMounted(true)
    checkGoogleApiConfigAction().then(setApiConfig)
  }, [])

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

      console.log("Authentication successful, fetching spreadsheet info...")

      try {
        const info = await getSpreadsheetInfoAction(spreadsheetId, accessToken)
        setSpreadsheetInfo(info)
        setStep("sheets")
      } catch (apiError: any) {
        console.error("API Error:", apiError)

        // Handle specific API errors
        if (apiError.message.includes("403") || apiError.message.includes("Acesso negado")) {
          setError(`
Erro de Permissão (403):

A planilha foi encontrada, mas você não tem permissão para acessá-la.

SOLUÇÕES:
1. Verifique se você tem acesso à planilha no Google Sheets
2. Certifique-se de que a planilha não é privada
3. Peça ao proprietário para compartilhar a planilha com você
4. Verifique se a Google Sheets API está habilitada no seu projeto

URL da planilha: ${spreadsheetUrl}
ID extraído: ${spreadsheetId}
          `)
        } else if (apiError.message.includes("404") || apiError.message.includes("não encontrada")) {
          setError(`
Planilha Não Encontrada (404):

A planilha com este ID não foi encontrada.

SOLUÇÕES:
1. Verifique se a URL está correta
2. Certifique-se de que a planilha não foi deletada
3. Verifique se você tem acesso à planilha

URL da planilha: ${spreadsheetUrl}
ID extraído: ${spreadsheetId}
          `)
        } else {
          setError(`
Erro ao Acessar Planilha:

${apiError.message}

INFORMAÇÕES DE DEBUG:
- URL: ${spreadsheetUrl}
- ID: ${spreadsheetId}
- Token: ${accessToken ? "Presente" : "Ausente"}

Tente novamente ou verifique se:
1. A Google Sheets API está habilitada
2. As credenciais estão corretas
3. A planilha existe e você tem acesso
          `)
        }

        setStep("url")
        toast.error("Erro ao acessar planilha. Verifique as instruções abaixo.")
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
Erro de configuração OAuth: redirect_uri_mismatch

INSTRUÇÕES PARA RESOLVER:

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

Domínio atual: ${mounted ? window.location.origin : "Carregando..."}
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

      const data = await getSheetDataAction(spreadsheetId, sheetName, accessToken)

      // Convert the server response back to preview format
      if (data.length > 0) {
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
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar dados da aba")
    }
  }

  const handleImport = async () => {
    if (!previewData) return

    setStep("importing")

    try {
      const spreadsheetId = await extractSpreadsheetIdAction(spreadsheetUrl)
      const accessToken = googleAuth.getAccessToken()

      if (!accessToken) {
        throw new Error("Token de acesso não encontrado")
      }

      const data = await getSheetDataAction(spreadsheetId, selectedSheet, accessToken)
      const result = await importGoogleSheetAction(selectedSheet, data)

      if (result.success) {
        toast.success(`Aba "${selectedSheet}" importada com sucesso!`)
        setIsOpen(false)
        onImportComplete()
        resetState()
      } else {
        toast.error("Erro ao importar dados")
        setStep("preview")
      }
    } catch (error: any) {
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

            {error && (
              <div className="text-sm text-red-500 p-3 bg-red-50 rounded-md border border-red-200">
                <div className="flex items-center gap-2 font-medium mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  Erro de Configuração
                </div>
                <div className="mb-3 whitespace-pre-line">{error}</div>
                <div className="text-xs space-y-1">
                  <div className="font-medium">Para configurar o Google Sheets:</div>
                  <div>1. Acesse o Google Cloud Console</div>
                  <div>2. Crie um projeto e ative a Google Sheets API</div>
                  <div>3. Configure as credenciais OAuth 2.0</div>
                  <div>
                    4. Adicione {mounted ? window.location.origin : "seu-dominio"} às URIs de redirecionamento
                    autorizadas
                  </div>
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
                <span>{previewData?.rows.length}+ registros</span>
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
            <p className="text-sm text-gray-500">Criando aba e inserindo registros no banco de dados.</p>
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
