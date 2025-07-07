"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FileUp, AlertTriangle, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { createTabAction, bulkCreateRowsAction } from "../app/actions"
import { LoadingSpinner } from "./loading-spinner"
import type { TabData, Column } from "../types"

interface CSVImportProps {
  onImportComplete: () => void
}

export function CSVImport({ onImportComplete }: CSVImportProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<string[][] | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Check if it's a CSV file
    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      toast.error("Por favor, selecione um arquivo CSV")
      return
    }

    setFile(selectedFile)

    // Read file for preview
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const rows = parseCSV(text)
        setPreviewData(rows)
      } catch (error) {
        console.error("Error parsing CSV:", error)
        toast.error("Erro ao ler o arquivo CSV")
      }
    }
    reader.readAsText(selectedFile)
  }

  const parseCSV = (text: string): string[][] => {
    // Simple CSV parser - can be improved for more complex CSVs
    const rows = text
      .split("\n")
      .map((row) => row.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))) // Remove quotes
      .filter((row) => row.some((cell) => cell.length > 0)) // Remove empty rows

    return rows
  }

  const handleImport = async () => {
    if (!file || !previewData || previewData.length < 2) {
      toast.error("Arquivo CSV inválido ou vazio")
      return
    }

    setIsImporting(true)

    try {
      const headers = previewData[0]
      const rows = previewData.slice(1)

      console.log("🔄 Starting CSV import...")
      console.log("Headers:", headers)
      console.log("Rows count:", rows.length)

      // Create columns based on headers
      const columns: Column[] = headers.map((header, index) => {
        const key = sanitizeKey(header)
        return {
          key,
          label: header,
          type: detectColumnType(
            header,
            rows.map((row) => row[index] || ""),
          ),
          width: estimateColumnWidth(
            header,
            rows.map((row) => row[index] || ""),
          ),
        }
      })

      // Create tab data
      const tabData: Omit<TabData, "rows"> = {
        id: `imported-csv-${Date.now()}`,
        name: file.name.replace(".csv", ""),
        columns,
        dashboardType: "rollout",
      }

      console.log("📝 Creating tab:", tabData)

      // First create the tab
      const tabResult = await createTabAction(tabData)

      if (!tabResult.success) {
        throw new Error(tabResult.error || "Failed to create tab")
      }

      console.log("✅ Tab created successfully")

      // Then create all rows
      const rowsData = rows
        .map((row, index) => {
          const rowData: any = {}

          headers.forEach((header, colIndex) => {
            const key = sanitizeKey(header)
            const value = row[colIndex] || ""
            if (value.trim()) {
              // Only add non-empty values
              rowData[key] = value.trim()
            }
          })

          // Only include rows that have at least one non-empty field
          const hasData = Object.values(rowData).some((value) => String(value).trim() !== "")
          if (hasData) {
            return {
              id: `imported-${Date.now()}-${index}`,
              ...rowData,
            }
          }
          return null
        })
        .filter(Boolean) // Remove null entries

      console.log("📊 Creating rows:", rowsData.length)

      if (rowsData.length > 0) {
        const rowsResult = await bulkCreateRowsAction(tabData.id, rowsData)

        if (!rowsResult.success) {
          console.warn("⚠️ Some rows failed to import:", rowsResult)
          toast.success(`Aba criada! ${rowsResult.imported || 0} registros importados com sucesso.`)
        } else {
          toast.success(`Arquivo CSV importado com sucesso! ${rowsData.length} registros adicionados.`)
        }
      } else {
        toast.success("Aba criada, mas nenhum registro válido foi encontrado no CSV.")
      }

      setIsOpen(false)
      onImportComplete()
      resetState()
    } catch (error: any) {
      console.error("❌ Import error:", error)
      toast.error(error.message || "Erro ao importar dados")
    } finally {
      setIsImporting(false)
    }
  }

  const resetState = () => {
    setFile(null)
    setPreviewData(null)
  }

  // Helper functions
  const sanitizeKey = (text: string): string => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9]/g, "_") // Replace special chars with _
      .replace(/_+/g, "_") // Remove duplicate _
      .replace(/^_|_$/g, "") // Remove _ from start and end
  }

  const detectColumnType = (header: string, values: string[]): Column["type"] => {
    const headerLower = header.toLowerCase()

    // Detect by column name
    if (headerLower.includes("data") || headerLower.includes("date")) {
      return "datetime"
    }

    if (headerLower.includes("status") || headerLower.includes("situacao") || headerLower.includes("realizado")) {
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

  const estimateColumnWidth = (header: string, values: string[]): number => {
    const maxLength = Math.max(header.length, ...values.map((v) => v.length))
    // Base width + width per character
    const width = Math.min(Math.max(maxLength * 8 + 40, 100), 400)
    return width
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
          className="border-2 border-dashed border-green-300 hover:border-green-500 hover:bg-green-50 text-green-600 hover:text-green-700 bg-transparent"
        >
          <FileUp className="w-4 h-4 mr-2" />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileUp className="w-5 h-5 text-green-600" />
            <span>Importar Arquivo CSV</span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {isImporting ? (
            <div className="text-center space-y-4">
              <LoadingSpinner size="lg" />
              <p>Importando dados...</p>
              <p className="text-sm text-gray-500">Criando aba e inserindo registros no banco de dados.</p>
            </div>
          ) : !file ? (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" id="csv-file-input" />
                <label htmlFor="csv-file-input" className="flex flex-col items-center justify-center cursor-pointer">
                  <FileUp className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-700">Clique para selecionar um arquivo CSV</p>
                  <p className="text-sm text-gray-500 mt-2">ou arraste e solte aqui</p>
                </label>
              </div>

              <div className="text-sm text-gray-600 p-3 bg-blue-50 rounded-md border border-blue-200">
                <div className="flex items-center gap-2 font-medium mb-2">
                  <AlertTriangle className="w-4 h-4 text-blue-600" />
                  Dicas para importação
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>O arquivo deve estar no formato CSV</li>
                  <li>A primeira linha deve conter os cabeçalhos das colunas</li>
                  <li>Certifique-se de que os dados estão separados por vírgulas</li>
                  <li>Recomendamos exportar do Excel ou Google Sheets como CSV</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Arquivo: {file.name}</h3>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB • {previewData?.length || 0} linhas
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-600 font-medium">Arquivo válido</span>
                </div>
              </div>

              {previewData && previewData.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Prévia dos dados:</h4>
                  <div className="max-h-60 overflow-auto border rounded">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {previewData[0].slice(0, 5).map((header, index) => (
                            <th key={index} className="p-2 text-left font-medium">
                              {header}
                            </th>
                          ))}
                          {previewData[0].length > 5 && <th className="p-2 text-left font-medium">...</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.slice(1, 6).map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-t">
                            {row.slice(0, 5).map((cell, cellIndex) => (
                              <td key={cellIndex} className="p-2 truncate max-w-32">
                                {cell || "-"}
                              </td>
                            ))}
                            {row.length > 5 && <td className="p-2 text-gray-400">...</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFile(null)
                    setPreviewData(null)
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleImport} className="bg-green-600 hover:bg-green-700">
                  <FileUp className="w-4 h-4 mr-2" />
                  Importar Dados
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
