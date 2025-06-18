"use client"

import { useState, useTransition, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, RefreshCw, Save, ExpandIcon } from "lucide-react"
import { EditableCell } from "./editable-cell"
import { LoadingSpinner } from "./loading-spinner"
import type { TabData } from "../types"
import { createRowAction, updateRowAction, deleteRowAction } from "../app/actions"
import { toast } from "sonner"

interface OptimizedSpreadsheetTableProps {
  tabData: TabData
  onRefresh: () => void
}

export function OptimizedSpreadsheetTable({ tabData, onRefresh }: OptimizedSpreadsheetTableProps) {
  const [isPending, startTransition] = useTransition()
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set())
  const [unsavedChanges, setUnsavedChanges] = useState<Map<string, any>>(new Map())
  const [compactMode, setCompactMode] = useState(true)

  // Debounce para salvar mudanças após um tempo sem edição
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null)

  const addRow = () => {
    startTransition(async () => {
      const newRow: { id: string } = {
        id: `row-${Date.now()}`,
      }

      tabData.columns.forEach((col) => {
        newRow[col.key] = ""
      })

      const result = await createRowAction(tabData.id, newRow)
      if (result.success) {
        toast.success("Linha adicionada com sucesso!")
        onRefresh()
      } else {
        toast.error("Erro ao adicionar linha")
      }
    })
  }

  const deleteRow = (rowId: string) => {
    startTransition(async () => {
      const result = await deleteRowAction(rowId)
      if (result.success) {
        toast.success("Linha removida com sucesso!")
        onRefresh()
      } else {
        toast.error("Erro ao remover linha")
      }
    })
  }

  const saveChanges = useCallback(async () => {
    if (unsavedChanges.size === 0) return

    const changesToSave = Array.from(unsavedChanges.entries())
    setUnsavedChanges(new Map())

    startTransition(async () => {
      try {
        for (const [rowId, changes] of changesToSave) {
          setPendingChanges((prev) => new Set(prev).add(rowId))

          const row = tabData.rows.find((r) => r.id === rowId)
          if (row) {
            const updatedRow = { ...row, ...changes }
            const result = await updateRowAction(tabData.id, updatedRow)

            if (!result.success) {
              toast.error(`Erro ao salvar linha: ${result.error}`)
            }
          }

          setPendingChanges((prev) => {
            const newSet = new Set(prev)
            newSet.delete(rowId)
            return newSet
          })
        }

        if (changesToSave.length > 0) {
          toast.success(`${changesToSave.length} alteração(ões) salva(s)!`)
          onRefresh()
        }
      } catch (error) {
        toast.error("Erro ao salvar alterações")
        console.error("Save error:", error)
      }
    })
  }, [unsavedChanges, tabData, onRefresh])

  const updateCell = (rowId: string, columnKey: string, value: any) => {
    // Atualiza o estado local imediatamente
    setUnsavedChanges((prev) => {
      const newChanges = new Map(prev)
      const rowChanges = newChanges.get(rowId) || {}
      newChanges.set(rowId, { ...rowChanges, [columnKey]: value })
      return newChanges
    })

    // Cancela o timeout anterior e cria um novo
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }

    // Salva após 2 segundos de inatividade
    const newTimeout = setTimeout(() => {
      saveChanges()
    }, 2000)

    setSaveTimeout(newTimeout)
  }

  // Função para salvar manualmente
  const handleManualSave = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
      setSaveTimeout(null)
    }
    saveChanges()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900">{tabData.name}</h2>
          <div className="flex items-center space-x-3">
            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {tabData.rows.length} registros
            </div>
            {unsavedChanges.size > 0 && (
              <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                {unsavedChanges.size} não salvo(s)
              </div>
            )}
            {isPending && (
              <div className="flex items-center space-x-2 text-blue-600">
                <LoadingSpinner size="sm" />
                <span className="text-sm">Sincronizando...</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCompactMode(!compactMode)}
            className="shadow-sm hover:shadow-md transition-all duration-200"
          >
            <ExpandIcon className="w-4 h-4 mr-2" />
            {compactMode ? "Expandir" : "Compactar"}
          </Button>
          {unsavedChanges.size > 0 && (
            <Button
              onClick={handleManualSave}
              disabled={isPending}
              className="bg-yellow-600 hover:bg-yellow-700 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar Agora ({unsavedChanges.size})
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={isPending}
            className="shadow-sm hover:shadow-md transition-all duration-200"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isPending ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button
            onClick={addRow}
            disabled={isPending}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Linha
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              {tabData.columns.map((column) => (
                <TableHead
                  key={column.key}
                  className="font-semibold text-gray-700 border-r last:border-r-0 py-4 px-3"
                  style={{
                    width: column.width ? `${column.width}px` : "auto",
                    maxWidth: column.width ? `${column.width}px` : "200px",
                    minWidth: "100px",
                  }}
                >
                  <div className="truncate" title={column.label}>
                    {column.label}
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-16 text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tabData.rows.map((row, index) => {
              const hasUnsavedChanges = unsavedChanges.has(row.id)
              const rowChanges = unsavedChanges.get(row.id) || {}

              return (
                <TableRow
                  key={row.id}
                  className={`
                    ${index % 2 === 0 ? "bg-white" : "bg-gray-50/30"}
                    ${pendingChanges.has(row.id) ? "bg-blue-50" : ""}
                    ${hasUnsavedChanges ? "bg-yellow-50 border-l-4 border-yellow-400" : ""}
                    hover:bg-blue-50/50 transition-colors
                    ${compactMode ? "h-12" : "h-auto"}
                  `}
                >
                  {tabData.columns.map((column) => {
                    // Mostra o valor local se houver mudanças não salvas
                    const displayValue = rowChanges[column.key] !== undefined ? rowChanges[column.key] : row[column.key]

                    return (
                      <TableCell
                        key={column.key}
                        className={`p-0 border-r last:border-r-0 relative overflow-hidden ${compactMode ? "max-h-12" : "max-h-32"}`}
                        style={{
                          width: column.width ? `${column.width}px` : "auto",
                          maxWidth: column.width ? `${column.width}px` : "200px",
                        }}
                      >
                        <EditableCell
                          value={displayValue}
                          column={column}
                          onSave={(value) => updateCell(row.id, column.key, value)}
                        />
                        {pendingChanges.has(row.id) && (
                          <div className="absolute top-1 right-1">
                            <LoadingSpinner size="sm" />
                          </div>
                        )}
                        {hasUnsavedChanges && rowChanges[column.key] !== undefined && (
                          <div className="absolute top-1 left-1">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          </div>
                        )}
                      </TableCell>
                    )
                  })}
                  <TableCell className="p-2 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRow(row.id)}
                      disabled={isPending}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Indicador de auto-save */}
      {saveTimeout && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <LoadingSpinner size="sm" />
            <span className="text-sm">Salvando em 2s...</span>
          </div>
        </div>
      )}
    </div>
  )
}
