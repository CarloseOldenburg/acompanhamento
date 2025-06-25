"use client"

import { useState, useTransition, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, RefreshCw, Save, Settings, Type, List, Calendar } from "lucide-react"
import { EditableCell } from "./editable-cell"
import { LoadingSpinner } from "./loading-spinner"
import type { TabData, Column } from "../types"
import { createRowAction, updateRowAction, deleteRowAction, updateTabAction } from "../app/actions"
import { toast } from "sonner"

interface EnhancedSpreadsheetTableProps {
  tabData: TabData
  onRefresh: () => void
}

export function EnhancedSpreadsheetTable({ tabData, onRefresh }: EnhancedSpreadsheetTableProps) {
  const [isPending, startTransition] = useTransition()
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set())
  const [unsavedChanges, setUnsavedChanges] = useState<Map<string, any>>(new Map())
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<string>("")
  const [showColumnEditor, setShowColumnEditor] = useState(false)
  const [editingColumns, setEditingColumns] = useState<Column[]>([])
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [newColumn, setNewColumn] = useState<Partial<Column>>({
    label: "",
    type: "text",
    width: 150,
  })

  // Get status column for bulk operations
  const statusColumn = tabData.columns.find((col) => col.key === "status" || col.label.toLowerCase().includes("status"))

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
        setSelectedRows((prev) => {
          const newSet = new Set(prev)
          newSet.delete(rowId)
          return newSet
        })
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
    // Busca o valor original da linha
    const originalRow = tabData.rows.find((r) => r.id === rowId)
    const originalValue = originalRow?.[columnKey]

    // Só marca como alterado se o valor realmente mudou
    if (value !== originalValue) {
      setUnsavedChanges((prev) => {
        const newChanges = new Map(prev)
        const rowChanges = newChanges.get(rowId) || {}
        newChanges.set(rowId, { ...rowChanges, [columnKey]: value })
        return newChanges
      })
    } else {
      // Se o valor voltou ao original, remove da lista de alterações
      setUnsavedChanges((prev) => {
        const newChanges = new Map(prev)
        const rowChanges = newChanges.get(rowId) || {}
        const { [columnKey]: removed, ...remainingChanges } = rowChanges

        if (Object.keys(remainingChanges).length === 0) {
          newChanges.delete(rowId)
        } else {
          newChanges.set(rowId, remainingChanges)
        }
        return newChanges
      })
    }
  }

  // Função para salvar manualmente
  const handleManualSave = () => {
    saveChanges()
  }

  // Bulk selection functions
  const toggleRowSelection = (rowId: string) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(rowId)) {
        newSet.delete(rowId)
      } else {
        newSet.add(rowId)
      }
      return newSet
    })
  }

  const toggleAllSelection = () => {
    if (selectedRows.size === tabData.rows.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(tabData.rows.map((row) => row.id)))
    }
  }

  const applyBulkStatus = () => {
    if (!bulkStatus || selectedRows.size === 0 || !statusColumn) {
      toast.error("Selecione um status e pelo menos uma linha")
      return
    }

    startTransition(async () => {
      let successCount = 0
      let errorCount = 0

      for (const rowId of selectedRows) {
        try {
          const row = tabData.rows.find((r) => r.id === rowId)
          if (row) {
            const updatedRow = { ...row, [statusColumn.key]: bulkStatus }
            const result = await updateRowAction(tabData.id, updatedRow)

            if (result.success) {
              successCount++
            } else {
              errorCount++
            }
          }
        } catch (error) {
          errorCount++
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} registro(s) atualizado(s) para "${bulkStatus}"`)
        setSelectedRows(new Set())
        setBulkStatus("")
        onRefresh()
      }

      if (errorCount > 0) {
        toast.error(`${errorCount} registro(s) falharam na atualização`)
      }
    })
  }

  // Column management functions
  const startEditColumns = () => {
    setEditingColumns([...tabData.columns])
    setShowColumnEditor(true)
  }

  const addColumn = () => {
    if (!newColumn.label?.trim()) {
      toast.error("Nome da coluna é obrigatório")
      return
    }

    const key = newColumn.label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")

    const column: Column = {
      key,
      label: newColumn.label.trim(),
      type: newColumn.type || "text",
      width: newColumn.width || 150,
    }

    if (column.type === "select") {
      column.options = ["Opção 1", "Opção 2", "Opção 3"]
    }

    setEditingColumns([...editingColumns, column])
    setNewColumn({ label: "", type: "text", width: 150 })
    setShowAddColumn(false)
    toast.success("Coluna adicionada!")
  }

  const updateColumn = (index: number, field: keyof Column, value: any) => {
    const updated = [...editingColumns]
    updated[index] = { ...updated[index], [field]: value }
    setEditingColumns(updated)
  }

  const removeColumn = (index: number) => {
    if (editingColumns.length > 1) {
      setEditingColumns(editingColumns.filter((_, i) => i !== index))
      toast.success("Coluna removida!")
    } else {
      toast.error("Deve haver pelo menos uma coluna")
    }
  }

  const saveColumns = async () => {
    startTransition(async () => {
      try {
        const result = await updateTabAction({
          id: tabData.id,
          name: tabData.name,
          columns: editingColumns,
        })

        if (result.success) {
          toast.success("Colunas atualizadas com sucesso!")
          setShowColumnEditor(false)
          onRefresh()
        } else {
          toast.error("Erro ao atualizar colunas")
        }
      } catch (error) {
        toast.error("Erro ao salvar colunas")
      }
    })
  }

  // Função para determinar a cor da linha baseada no status - ATUALIZADA COM NOVOS STATUS
  const getRowStatusColor = (row: any) => {
    if (!statusColumn) return ""

    const rowChanges = unsavedChanges.get(row.id) || {}
    const currentStatus =
      rowChanges[statusColumn.key] !== undefined ? rowChanges[statusColumn.key] : row[statusColumn.key]
    const status = currentStatus?.toLowerCase()

    if (status?.includes("conclu") || status?.includes("finaliz")) {
      return "bg-green-50 border-l-4 border-green-500"
    } else if (status?.includes("pendente")) {
      return "bg-yellow-50 border-l-4 border-yellow-500"
    } else if (status?.includes("agend")) {
      return "bg-blue-50 border-l-4 border-blue-500"
    } else if (status?.includes("erro")) {
      return "bg-red-50 border-l-4 border-red-500"
    } else if (status?.includes("sem retorno")) {
      return "bg-orange-50 border-l-4 border-orange-500"
    }

    return ""
  }

  // Função para formatar data/hora de forma mais legível
  const formatDateTime = (value: string) => {
    if (!value) return ""

    // Se for formato ISO (2025-06-26T11:00)
    if (value.includes("T")) {
      const [date, time] = value.split("T")
      const [year, month, day] = date.split("-")
      const [hour, minute] = time.split(":")
      return `${day}/${month}/${year} ${hour}:${minute}`
    }

    return value
  }

  // Função para otimizar larguras das colunas baseado no conteúdo
  const getOptimizedColumnWidth = (column: Column) => {
    const key = column.key.toLowerCase()

    // Larguras otimizadas para caber tudo na tela
    if (key.includes("carimbo") || key.includes("data")) {
      return 140 // Data/hora compacta
    } else if (key.includes("nome") || key.includes("restaurante")) {
      return 180 // Nome do restaurante
    } else if (key.includes("telefone")) {
      return 120 // Telefone
    } else if (key.includes("solicitante")) {
      return 100 // Solicitante
    } else if (key.includes("merchant")) {
      return 120 // Merchant ID (truncado)
    } else if (key.includes("pdv") || key.includes("integradora")) {
      return 120 // PDV/Integradora
    } else if (key.includes("observacao")) {
      return 200 // Observação (mais espaço)
    } else if (key.includes("status")) {
      return 100 // Status
    } else if (key.includes("agendamento")) {
      return 140 // Data de agendamento
    } else if (key.includes("loja")) {
      return 250 // Para rollout - nome da loja
    }

    return column.width || 120 // Default menor
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors duration-200">
            {tabData.name}
          </h2>
          <div className="flex items-center space-x-3">
            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors duration-200">
              {tabData.rows.length} registros
            </div>
            {selectedRows.size > 0 && (
              <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium animate-pulse">
                {selectedRows.size} selecionado(s)
              </div>
            )}
            {unsavedChanges.size > 0 && (
              <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium animate-bounce">
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
            onClick={startEditColumns}
            className="shadow-sm hover:shadow-lg hover:scale-110 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 group"
          >
            <Settings className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            Editar Colunas
          </Button>
          {unsavedChanges.size > 0 && (
            <Button
              onClick={handleManualSave}
              disabled={isPending}
              className="bg-yellow-600 hover:bg-yellow-700 shadow-sm hover:shadow-lg hover:scale-110 transition-all duration-300 group"
            >
              <Save className="w-4 h-4 mr-2 group-hover:scale-125 transition-transform duration-300" />
              Salvar Agora ({unsavedChanges.size})
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={isPending}
            className="shadow-sm hover:shadow-lg hover:scale-110 hover:bg-green-50 hover:border-green-300 transition-all duration-300 group"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isPending ? "animate-spin" : "group-hover:rotate-180"} transition-transform duration-300`}
            />
            Atualizar
          </Button>
          <Button
            onClick={addRow}
            disabled={isPending}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-sm hover:shadow-lg hover:scale-110 transition-all duration-300 group"
          >
            <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            Adicionar Linha
          </Button>
        </div>
      </div>

      {/* Bulk Actions */}
      {statusColumn && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="font-medium text-gray-900">Ações em Massa</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Status:</span>
                <Select value={bulkStatus} onValueChange={setBulkStatus}>
                  <SelectTrigger className="w-48 hover:scale-105 transition-transform duration-200">
                    <SelectValue placeholder="Selecionar status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {statusColumn.options?.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={applyBulkStatus}
                  disabled={!bulkStatus || selectedRows.size === 0 || isPending}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 hover:scale-110 hover:shadow-lg transition-all duration-300 group"
                >
                  <span className="group-hover:scale-105 transition-transform duration-200">
                    Aplicar a {selectedRows.size} selecionado(s)
                  </span>
                </Button>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {selectedRows.size} de {tabData.rows.length} selecionado(s)
            </div>
          </div>
        </div>
      )}

      {/* Table - Otimizada para caber na tela */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
        <div className="overflow-x-auto">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="w-12 text-center">
                  <Checkbox
                    checked={selectedRows.size === tabData.rows.length && tabData.rows.length > 0}
                    onCheckedChange={toggleAllSelection}
                    className="mx-auto hover:scale-110 transition-transform duration-200"
                  />
                </TableHead>
                {tabData.columns.map((column) => {
                  const optimizedWidth = getOptimizedColumnWidth(column)

                  return (
                    <TableHead
                      key={column.key}
                      className="font-semibold text-gray-700 border-r last:border-r-0 py-4 px-2 hover:bg-gray-100 transition-colors duration-200 text-xs"
                      style={{
                        width: `${optimizedWidth}px`,
                        maxWidth: `${optimizedWidth}px`,
                        minWidth: `${optimizedWidth}px`,
                      }}
                    >
                      <div className="truncate" title={column.label}>
                        {column.label}
                      </div>
                    </TableHead>
                  )
                })}
                <TableHead className="w-16 text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabData.rows.map((row, index) => {
                const hasUnsavedChanges = unsavedChanges.has(row.id)
                const rowChanges = unsavedChanges.get(row.id) || {}
                const isSelected = selectedRows.has(row.id)
                const statusColorClass = getRowStatusColor(row)

                return (
                  <TableRow
                    key={row.id}
                    className={`
                      ${index % 2 === 0 ? "bg-white" : "bg-gray-50/30"}
                      ${pendingChanges.has(row.id) ? "bg-blue-50 border-l-4 border-blue-400" : ""}
                      ${hasUnsavedChanges ? "bg-yellow-50 border-l-4 border-yellow-400" : ""}
                      ${isSelected ? "bg-blue-100 border-l-4 border-blue-500" : ""}
                      ${!pendingChanges.has(row.id) && !hasUnsavedChanges && !isSelected ? statusColorClass : ""}
                      hover:bg-blue-50/50 transition-all duration-200
                    `}
                  >
                    <TableCell className="text-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleRowSelection(row.id)}
                        className="hover:scale-110 transition-transform duration-200"
                      />
                    </TableCell>
                    {tabData.columns.map((column) => {
                      // Mostra o valor local se houver mudanças não salvas
                      let displayValue = rowChanges[column.key] !== undefined ? rowChanges[column.key] : row[column.key]

                      // Formatar data/hora para exibição mais legível
                      if ((column.type === "datetime" || column.key.toLowerCase().includes("data")) && displayValue) {
                        displayValue = formatDateTime(displayValue)
                      }

                      const optimizedWidth = getOptimizedColumnWidth(column)

                      return (
                        <TableCell
                          key={column.key}
                          className={`p-0 border-r last:border-r-0 relative overflow-hidden hover:bg-blue-50/30 transition-colors duration-200`}
                          style={{
                            width: `${optimizedWidth}px`,
                            maxWidth: `${optimizedWidth}px`,
                            minWidth: `${optimizedWidth}px`,
                          }}
                        >
                          <EditableCell
                            value={rowChanges[column.key] !== undefined ? rowChanges[column.key] : row[column.key]}
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
                              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
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
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 hover:scale-125 transition-all duration-200 group"
                      >
                        <Trash2 className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Column Editor Dialog */}
      <Dialog open={showColumnEditor} onOpenChange={setShowColumnEditor}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">Editar Colunas - {tabData.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-gray-900">Configurar Colunas</h4>
              <Dialog open={showAddColumn} onOpenChange={setShowAddColumn}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 hover:scale-110 hover:shadow-lg transition-all duration-300 group"
                  >
                    <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                    Adicionar Coluna
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Nova Coluna</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="column-name">Nome da Coluna</Label>
                      <Input
                        id="column-name"
                        value={newColumn.label || ""}
                        onChange={(e) => setNewColumn({ ...newColumn, label: e.target.value })}
                        placeholder="Ex: Status, Data, Observação..."
                        className="focus:scale-105 transition-transform duration-200"
                      />
                    </div>
                    <div>
                      <Label htmlFor="column-type">Tipo</Label>
                      <Select
                        value={newColumn.type || "text"}
                        onValueChange={(value) => setNewColumn({ ...newColumn, type: value as Column["type"] })}
                      >
                        <SelectTrigger className="hover:scale-105 transition-transform duration-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">
                            <div className="flex items-center">
                              <Type className="w-4 h-4 mr-2" />
                              Texto
                            </div>
                          </SelectItem>
                          <SelectItem value="select">
                            <div className="flex items-center">
                              <List className="w-4 h-4 mr-2" />
                              Lista de Opções
                            </div>
                          </SelectItem>
                          <SelectItem value="date">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2" />
                              Data
                            </div>
                          </SelectItem>
                          <SelectItem value="datetime">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2" />
                              Data e Hora
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="column-width">Largura (px)</Label>
                      <Input
                        id="column-width"
                        type="number"
                        value={newColumn.width || 150}
                        onChange={(e) => setNewColumn({ ...newColumn, width: Number(e.target.value) })}
                        min="100"
                        max="500"
                        className="focus:scale-105 transition-transform duration-200"
                      />
                    </div>
                    <div className="flex justify-end space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowAddColumn(false)}
                        className="hover:scale-105 transition-transform duration-200"
                      >
                        Cancelar
                      </Button>
                      <Button onClick={addColumn} className="hover:scale-105 transition-transform duration-200">
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {editingColumns.map((column, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-gray-100 hover:scale-[1.02] transition-all duration-200"
                >
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-3">
                      <Label className="text-xs font-medium text-gray-700 mb-1 block">Nome da Coluna</Label>
                      <Input
                        value={column.label}
                        onChange={(e) => updateColumn(index, "label", e.target.value)}
                        className="h-9 focus:scale-105 transition-transform duration-200"
                        placeholder="Nome da coluna"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs font-medium text-gray-700 mb-1 block">Chave (ID)</Label>
                      <Input
                        value={column.key}
                        onChange={(e) => updateColumn(index, "key", e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                        className="h-9 focus:scale-105 transition-transform duration-200"
                        placeholder="chave_coluna"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs font-medium text-gray-700 mb-1 block">Tipo</Label>
                      <Select value={column.type} onValueChange={(value) => updateColumn(index, "type", value)}>
                        <SelectTrigger className="h-9 hover:scale-105 transition-transform duration-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Texto</SelectItem>
                          <SelectItem value="select">Lista de Opções</SelectItem>
                          <SelectItem value="date">Data</SelectItem>
                          <SelectItem value="datetime">Data e Hora</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs font-medium text-gray-700 mb-1 block">Largura (px)</Label>
                      <Input
                        type="number"
                        value={column.width || 150}
                        onChange={(e) => updateColumn(index, "width", Number.parseInt(e.target.value))}
                        className="h-9 focus:scale-105 transition-transform duration-200"
                        min="100"
                        max="500"
                      />
                    </div>

                    <div className="col-span-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeColumn(index)}
                        disabled={editingColumns.length <= 1}
                        className="h-9 w-full text-red-500 hover:text-red-700 hover:bg-red-50 hover:scale-110 transition-all duration-200 group"
                      >
                        <Trash2 className="w-4 h-4 mr-1 group-hover:rotate-12 transition-transform duration-200" />
                        Remover
                      </Button>
                    </div>

                    <div className="col-span-1">
                      <span className="text-xs text-gray-500">#{index + 1}</span>
                    </div>
                  </div>

                  {column.type === "select" && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <Label className="text-xs font-medium text-gray-700 mb-1 block">
                        Opções (separadas por vírgula)
                      </Label>
                      <Input
                        value={column.options?.join(", ") || ""}
                        onChange={(e) => updateColumn(index, "options", e.target.value.split(", ").filter(Boolean))}
                        placeholder="Opção 1, Opção 2, Opção 3"
                        className="h-9 focus:scale-105 transition-transform duration-200"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => setShowColumnEditor(false)}
                disabled={isPending}
                className="hover:scale-105 transition-transform duration-200"
              >
                Cancelar
              </Button>
              <Button
                onClick={saveColumns}
                disabled={isPending}
                className="bg-blue-600 hover:bg-blue-700 hover:scale-105 hover:shadow-lg transition-all duration-200"
              >
                {isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
