"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { FileSpreadsheet, Download, CheckCircle, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { GoogleSheetsIntegration } from "../lib/google-sheets"
import { LoadingSpinner } from "./loading-spinner"
import type { TabData } from "../types"
import { createTabAction } from "../app/actions"

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
  const [isClient, setIsClient] = useState(false)
  const [sheetsIntegration, setSheetsIntegration] = useState<GoogleSheetsIntegration | null>(null)

  // Fix hydration issue by ensuring client-side only rendering
  useEffect(() => {
    setIsClient(true)
    if (process.env.NEXT_PUBLIC_GOOGLE_API_KEY) {
      setSheetsIntegration(new GoogleSheetsIntegration(process.env.NEXT_PUBLIC_GOOGLE_API_KEY))
    }
  }, [])

  const handleUrlSubmit = async () => {
    if (!sheetsIntegration) {
      toast.error("Google Sheets integration not initialized")
      return
    }

    setError(null)

    // Check if environment variables are configured
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY

    if (!clientId || !apiKey) {
      const missingVars = []
      if (!clientId) missingVars.push("NEXT_PUBLIC_GOOGLE_CLIENT_ID")
      if (!apiKey) missingVars.push("NEXT_PUBLIC_GOOGLE_API_KEY")

      setError(`Configuração do Google API não encontrada. Variáveis necessárias: ${missingVars.join(", ")}`)
      toast.error("Google API não configurado. Verifique as variáveis de ambiente.")
      return
    }

    const spreadsheetId = GoogleSheetsIntegration.extractSpreadsheetId(spreadsheetUrl)
    if (!spreadsheetId) {
      toast.error("URL inválida. Use uma URL do Google Sheets.")
      return
    }

    setStep("auth")

    try {
      const authenticated = await sheetsIntegration.authenticate()
      if (!authenticated) {
        throw new Error("Falha na autenticação com Google")
      }

      const info = await sheetsIntegration.getSpreadsheetInfo(spreadsheetId)
      setSpreadsheetInfo(info)
      setStep("sheets")
    } catch (error: any) {
      console.error("Erro na autenticação:", error)

      // Handle specific OAuth errors
      if (error.message.includes("redirect_uri_mismatch")) {
        setError(
          "Erro de configuração OAuth: O redirect URI não está configurado corretamente no Google Cloud Console. Adicione o domínio atual às URIs autorizadas.",
        )
      } else {
        setError(error.message || "Erro ao acessar planilha")
      }

      setStep("url")
      toast.error(error.message || "Erro ao acessar planilha")
    }
  }

  const handleSheetSelect = async (sheetName: string) => {
    if (!sheetsIntegration) return

    setSelectedSheet(sheetName)

    try {
      const spreadsheetId = GoogleSheetsIntegration.extractSpreadsheetId(spreadsheetUrl)!
      const data = await sheetsIntegration.getSheetData(spreadsheetId, sheetName)
      const tabData = sheetsIntegration.convertToTabData(sheetName, data)
      setPreviewData(tabData)
      setStep("preview")
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar dados da aba")
    }
  }

  const handleImport = async () => {
    if (!previewData) return

    setStep("importing")

    try {
      const result = await createTabAction(previewData)
      if (result.success) {
        toast.success(`Aba "${previewData.name}" importada com sucesso!`)
        setIsOpen(false)
        onImportComplete()
        resetState()
      } else {
        toast.error("Erro ao importar dados")
        setStep("preview")
      }
    } catch (error) {
      toast.error("Erro ao importar dados")
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
                <div className="mb-3">{error}</div>
                <div className="text-xs space-y-1">
                  <div className="font-medium">Para configurar o Google Sheets:</div>
                  <div>1. Acesse o Google Cloud Console</div>
                  <div>2. Crie um projeto e ative a Google Sheets API</div>
                  <div>3. Configure as credenciais OAuth 2.0</div>
                  <div>
                    4. Adicione {isClient ? window.location.origin : "seu-dominio"} às URIs de redirecionamento
                    autorizadas
                  </div>
                  <div>5. Adicione as variáveis de ambiente no seu projeto</div>
                </div>
              </div>
            )}

            <Button onClick={handleUrlSubmit} className="w-full" disabled={!spreadsheetUrl.trim()}>
              Conectar Planilha
            </Button>

            {isClient && !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
              <div className="text-xs text-amber-600 p-2 bg-amber-50 rounded-md border border-amber-200">
                ⚠️ Google API não configurado. Esta funcionalidade requer configuração adicional.
              </div>
            )}
          </div>
        )

      case "auth":
        return (
          <div className="text-center space-y-4">
            <LoadingSpinner size="lg" />
            <p>Autenticando com Google...</p>
            <p className="text-sm text-gray-500">
              Uma janela de autorização será aberta. Permita o acesso às suas planilhas.
            </p>
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
                <span>{previewData?.rows.length} registros</span>
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
            <p className="text-sm text-gray-500">
              Criando aba e inserindo {previewData?.rows.length} registros no banco de dados.
            </p>
          </div>
        )

      default:
        return null
    }
  }

  // Don't render until client-side to avoid hydration issues
  if (!isClient) {
    return (
      <Button
        variant="outline"
        disabled
        className="border-2 border-dashed border-gray-300 text-gray-400 cursor-not-allowed"
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
        </DialogHeader>

        <div className="py-4">
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
