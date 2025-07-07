"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Plus,
  Search,
  Filter,
  Download,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react"
import { EditableCell } from "./editable-cell"
import { createRowAction, updateRowAction, deleteRowAction } from "../app/actions"
import { toast } from "sonner"
import type { TabData, RowData } from "../types"

interface EnhancedSpreadsheetTableProps {
  tabData: TabData
  onRefresh: () => void
}

export function EnhancedSpreadsheetTable({ tabData, onRefresh }: EnhancedSpreadsheetTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [isAddingRow, setIsAddingRow] = useState(false)
  const [newRowData, setNewRowData] = useState<Record<string, any>>({})
  const [editingRow, setEditingRow] = useState<RowData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Verificação de segurança para tabData
  const safeTabData = useMemo(() => {
    if (!tabData || typeof tabData !== "object") {
      console.warn("⚠️ Invalid tabData:", tabData)
      return {
        id: "unknown",
        name: "Unknown Tab",
        columns: [],
        rows: [],
        dashboardType: "rollout" as const,
      }
    }

    return {
      id: tabData.id || "unknown",
      name: tabData.name || "Unknown Tab",
      columns: Array.isArray(tabData.columns) ? tabData.columns : [],
      rows: Array.isArray(tabData.rows) ? tabData.rows : [],
      dashboardType: tabData.dashboardType || ("rollout" as const),
    }
  }, [tabData])

  // Filtrar dados
  const filteredRows = useMemo(() => {
    let filtered = safeTabData.rows

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter((row) =>
        Object.values(row).some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
        ),
      )
    }

    // Filtro por status
    if (filterStatus !== "all") {
      filtered = filtered.filter((row) => row.status === filterStatus)
    }

    return filtered
  }, [safeTabData.rows, searchTerm, filterStatus])

  // Obter status únicos
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set<string>()
    safeTabData.rows.forEach((row) => {
      if (row.status) {
        statuses.add(row.status)
      }
    })
    return Array.from(statuses)
  }, [safeTabData.rows])

  // Resetar dados do novo registro quando as colunas mudarem
  useEffect(() => {
    const initialData: Record<string, any> = {}
    safeTabData.columns.forEach((col) => {
      initialData[col.key] = ""
    })
    setNewRowData(initialData)
  }, [safeTabData.columns])

  const handleAddRow = async () => {
    if (!safeTabData.id) {
      toast.error("ID da aba não encontrado")
      return
    }

    // Validar campos obrigatórios
    const hasRequiredData = safeTabData.columns.some((col) => newRowData[col.key] && String(newRowData[col.key]).trim())

    if (!hasRequiredData) {
      toast.error("Preencha pelo menos um campo")
      return
    }

    setIsLoading(true)
    try {
      const result = await createRowAction(safeTabData.id, newRowData)

      if (result.success) {
        toast.success("Registro adicionado com sucesso!")
        setIsAddingRow(false)

        // Resetar formulário
        const resetData: Record<string, any> = {}
        safeTabData.columns.forEach((col) => {
          resetData[col.key] = ""
        })
        setNewRowData(resetData)

        onRefresh()
      } else {
        toast.error(`Erro ao adicionar registro: ${result.error}`)
      }
    } catch (error) {
      console.error("Error adding row:", error)
      toast.error("Erro inesperado ao adicionar registro")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateRow = async (rowId: string, field: string, value: any) => {
    if (!safeTabData.id) {
      toast.error("ID da aba não encontrado")
      return
    }

    setIsLoading(true)
    try {
      const result = await updateRowAction(safeTabData.id, rowId, { [field]: value })

      if (result.success) {
        toast.success("Registro atualizado!")
        onRefresh()
      } else {
        toast.error(`Erro ao atualizar: ${result.error}`)
      }
    } catch (error) {
      console.error("Error updating row:", error)
      toast.error("Erro inesperado ao atualizar")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteRow = async (rowId: string) => {
    if (!safeTabData.id) {
      toast.error("ID da aba não encontrado")
      return
    }

    setIsLoading(true)
    try {
      const result = await deleteRowAction(safeTabData.id, rowId)

      if (result.success) {
        toast.success("Registro excluído!")
        onRefresh()
      } else {
        toast.error(`Erro ao excluir: ${result.error}`)
      }
    } catch (error) {
      console.error("Error deleting row:", error)
      toast.error("Erro inesperado ao excluir")
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportData = () => {
    const exportData = filteredRows.map((row, index) => ({
      ID: index + 1,
      ...row,
      "Data de Exportação": new Date().toLocaleDateString("pt-BR"),
    }))

    const headers = Object.keys(exportData[0] || {})
    const csvContent = [
      headers.join(","),
      ...exportData.map((row) =>
        headers
          .map((header) => `"${(row[header as keyof typeof row] || "").toString().replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${safeTabData.name}_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success("Dados exportados com sucesso!")
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "concluído":
      case "concluido":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "pendente":
        return <Clock className="w-4 h-4 text-yellow-600" />
      case "erro":
        return <XCircle className="w-4 h-4 text-red-600" />
      case "agendado":
      case "em andamento":
        return <RefreshCw className="w-4 h-4 text-blue-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || ""

    if (statusLower.includes("concluí")) {
      return <Badge className="bg-green-100 text-green-800">{status}</Badge>
    } else if (statusLower.includes("pendente")) {
      return <Badge className="bg-yellow-100 text-yellow-800">{status}</Badge>
    } else if (statusLower.includes("erro")) {
      return <Badge className="bg-red-100 text-red-800">{status}</Badge>
    } else if (statusLower.includes("agendado") || statusLower.includes("andamento")) {
      return <Badge className="bg-blue-100 text-blue-800">{status}</Badge>
    } else {
      return <Badge variant="outline">{status}</Badge>
    }
  }

  if (safeTabData.columns.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Estrutura da aba não encontrada</h3>
          <p className="text-gray-600">Esta aba não possui colunas definidas.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com controles */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>{safeTabData.name}</span>
                <Badge variant="outline">
                  {filteredRows.length} de {safeTabData.rows.length} registros
                </Badge>
              </CardTitle>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar registros..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>

              {/* Filtro por status */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center space-x-2 bg-transparent">
                    <Filter className="w-4 h-4" />
                    <span>{filterStatus === "all" ? "Todos" : filterStatus}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setFilterStatus("all")}>Todos os Status</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {uniqueStatuses.map((status) => (
                    <DropdownMenuItem key={status} onClick={() => setFilterStatus(status)}>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(status)}
                        <span>{status}</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Ações */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={handleExportData}
                  disabled={filteredRows.length === 0}
                  className="flex items-center space-x-2 bg-transparent"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Exportar</span>
                </Button>

                <Button
                  onClick={() => setIsAddingRow(true)}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar</span>
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {safeTabData.columns.map((column) => (
                    <TableHead key={column.key} className="font-semibold">
                      {column.label}
                    </TableHead>
                  ))}
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={safeTabData.columns.length + 1} className="text-center py-12 text-gray-500">
                      {searchTerm || filterStatus !== "all"
                        ? "Nenhum registro encontrado com os filtros aplicados"
                        : "Nenhum registro encontrado. Adicione o primeiro registro."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row, index) => (
                    <TableRow key={row.id || index} className="hover:bg-gray-50">
                      {safeTabData.columns.map((column) => (
                        <TableCell key={column.key}>
                          {column.key === "status" ? (
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(row[column.key])}
                              {getStatusBadge(row[column.key] || "Sem Status")}
                            </div>
                          ) : (
                            <EditableCell
                              value={row[column.key] || ""}
                              column={column}
                              onSave={(value) => handleUpdateRow(row.id, column.key, value)}
                              disabled={isLoading}
                            />
                          )}
                        </TableCell>
                      ))}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingRow(row)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingRow(row)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteRow(row.id)}
                              className="text-red-600 focus:text-red-600"
                              disabled={isLoading}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para adicionar novo registro */}
      <Dialog open={isAddingRow} onOpenChange={setIsAddingRow}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Registro</DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo para adicionar um novo registro à aba "{safeTabData.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
            {safeTabData.columns.map((column) => (
              <div key={column.key} className="space-y-2">
                <label className="text-sm font-medium">{column.label}</label>
                <EditableCell
                  value={newRowData[column.key] || ""}
                  column={column}
                  onSave={(value) => setNewRowData((prev) => ({ ...prev, [column.key]: value }))}
                  disabled={isLoading}
                  autoFocus={false}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingRow(false)
                const resetData: Record<string, any> = {}
                safeTabData.columns.forEach((col) => {
                  resetData[col.key] = ""
                })
                setNewRowData(resetData)
              }}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddRow} disabled={isLoading}>
              {isLoading ? "Adicionando..." : "Adicionar Registro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para visualizar/editar registro */}
      <Dialog open={!!editingRow} onOpenChange={() => setEditingRow(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalhes do Registro</DialogTitle>
            <DialogDescription>Visualize e edite os dados do registro selecionado.</DialogDescription>
          </DialogHeader>
          {editingRow && (
            <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
              {safeTabData.columns.map((column) => (
                <div key={column.key} className="space-y-2">
                  <label className="text-sm font-medium">{column.label}</label>
                  <EditableCell
                    value={editingRow[column.key] || ""}
                    column={column}
                    onSave={(value) => handleUpdateRow(editingRow.id, column.key, value)}
                    disabled={isLoading}
                    autoFocus={false}
                  />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRow(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
