"use client"

import { useState, useTransition } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, RefreshCw } from "lucide-react"
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

  const updateCell = (rowId: string, columnKey: string, value: any) => {
    setPendingChanges((prev) => new Set(prev).add(rowId))

    startTransition(async () => {
      const row = tabData.rows.find((r) => r.id === rowId)
      if (row) {
        const updatedRow = { ...row, [columnKey]: value }
        const result = await updateRowAction(tabData.id, updatedRow)

        if (result.success) {
          toast.success("Dados atualizados!")
          onRefresh()
        } else {
          toast.error("Erro ao atualizar dados")
        }
      }

      setPendingChanges((prev) => {
        const newSet = new Set(prev)
        newSet.delete(rowId)
        return newSet
      })
    })
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
                  className="font-semibold text-gray-700 border-r last:border-r-0 py-4"
                  style={{ width: column.width ? `${column.width}px` : "auto" }}
                >
                  {column.label}
                </TableHead>
              ))}
              <TableHead className="w-16 text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tabData.rows.map((row, index) => (
              <TableRow
                key={row.id}
                className={`
                  ${index % 2 === 0 ? "bg-white" : "bg-gray-50/30"}
                  ${pendingChanges.has(row.id) ? "bg-blue-50" : ""}
                  hover:bg-blue-50/50 transition-colors
                `}
              >
                {tabData.columns.map((column) => (
                  <TableCell key={column.key} className="p-0 border-r last:border-r-0 relative">
                    <EditableCell
                      value={row[column.key]}
                      column={column}
                      onSave={(value) => updateCell(row.id, column.key, value)}
                    />
                    {pendingChanges.has(row.id) && (
                      <div className="absolute top-1 right-1">
                        <LoadingSpinner size="sm" />
                      </div>
                    )}
                  </TableCell>
                ))}
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
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
