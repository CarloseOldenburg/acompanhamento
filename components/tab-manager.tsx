"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Share2,
  Download,
  Eye,
  FileUp,
  Settings,
  Table,
  TestTube,
} from "lucide-react"
import { CSVImport } from "./csv-import"
import { GoogleSheetsImport } from "./google-sheets-import"
import { createTabAction, updateTabAction, deleteTabAction } from "../app/actions"
import { toast } from "sonner"
import type { TabData, Column } from "../types"

interface TabManagerProps {
  tabs: TabData[]
  onUpdateTabs: () => void
  activeTab: string
  onSetActiveTab: (tabId: string) => void
}

export function TabManager({ tabs, onUpdateTabs, activeTab, onSetActiveTab }: TabManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [editingTab, setEditingTab] = useState<TabData | null>(null)
  const [newTabName, setNewTabName] = useState("")
  const [newTabType, setNewTabType] = useState<"rollout" | "testing">("rollout")
  const [isLoading, setIsLoading] = useState(false)

  const handleCreateTab = async () => {
    if (!newTabName.trim()) {
      toast.error("Nome da aba é obrigatório")
      return
    }

    setIsLoading(true)
    try {
      const defaultColumns: Column[] = [
        { key: "nome", label: "Nome", type: "text", width: 200 },
        {
          key: "status",
          label: "Status",
          type: "select",
          width: 120,
          options: ["Pendente", "Em Andamento", "Concluído"],
        },
        { key: "data", label: "Data", type: "date", width: 120 },
        { key: "observacoes", label: "Observações", type: "textarea", width: 300 },
      ]

      const tabData: Omit<TabData, "rows"> = {
        id: `tab-${Date.now()}`,
        name: newTabName.trim(),
        columns: defaultColumns,
        dashboardType: newTabType,
      }

      const result = await createTabAction(tabData)

      if (result.success) {
        toast.success("Aba criada com sucesso!")
        setIsCreateDialogOpen(false)
        setNewTabName("")
        setNewTabType("rollout")
        onUpdateTabs()
        onSetActiveTab(tabData.id)
      } else {
        toast.error(`Erro ao criar aba: ${result.error}`)
      }
    } catch (error) {
      console.error("Error creating tab:", error)
      toast.error("Erro inesperado ao criar aba")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditTab = async () => {
    if (!editingTab || !newTabName.trim()) {
      toast.error("Nome da aba é obrigatório")
      return
    }

    setIsLoading(true)
    try {
      const tabData = {
        ...editingTab,
        name: newTabName.trim(),
        dashboardType: newTabType,
      }

      const result = await updateTabAction(tabData)

      if (result.success) {
        toast.success("Aba atualizada com sucesso!")
        setIsEditDialogOpen(false)
        setEditingTab(null)
        setNewTabName("")
        onUpdateTabs()
      } else {
        toast.error(`Erro ao atualizar aba: ${result.error}`)
      }
    } catch (error) {
      console.error("Error updating tab:", error)
      toast.error("Erro inesperado ao atualizar aba")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTab = async (tabId: string, tabName: string) => {
    if (!confirm(`Tem certeza que deseja excluir a aba "${tabName}"? Esta ação não pode ser desfeita.`)) {
      return
    }

    setIsLoading(true)
    try {
      const result = await deleteTabAction(tabId)

      if (result.success) {
        toast.success("Aba excluída com sucesso!")
        onUpdateTabs()

        // If the deleted tab was active, switch to the first available tab
        if (activeTab === tabId && tabs.length > 1) {
          const remainingTabs = tabs.filter((tab) => tab.id !== tabId)
          if (remainingTabs.length > 0) {
            onSetActiveTab(remainingTabs[0].id)
          }
        }
      } else {
        toast.error(`Erro ao excluir aba: ${result.error}`)
      }
    } catch (error) {
      console.error("Error deleting tab:", error)
      toast.error("Erro inesperado ao excluir aba")
    } finally {
      setIsLoading(false)
    }
  }

  const handleShareTab = (tabId: string) => {
    const shareUrl = `${window.location.origin}/share/${tabId}`
    navigator.clipboard.writeText(shareUrl)
    toast.success("Link de compartilhamento copiado!")
  }

  const handleExportTab = (tab: TabData) => {
    const exportData = {
      tabInfo: {
        id: tab.id,
        name: tab.name,
        dashboardType: tab.dashboardType,
        columns: tab.columns,
        exportDate: new Date().toISOString(),
      },
      data: tab.rows,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${tab.name}_${new Date().toISOString().split("T")[0]}.json`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success("Aba exportada com sucesso!")
  }

  const openEditDialog = (tab: TabData) => {
    setEditingTab(tab)
    setNewTabName(tab.name)
    setNewTabType(tab.dashboardType || "rollout")
    setIsEditDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Gerenciar Abas</h3>
          <Badge variant="outline">{tabs.length} abas</Badge>
        </div>

        <div className="flex items-center space-x-2">
          {/* Import Button */}
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2 bg-transparent">
                <FileUp className="w-4 h-4" />
                <span>Importar</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Importar Dados</DialogTitle>
                <DialogDescription>Escolha como deseja importar seus dados para criar uma nova aba.</DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="csv" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="csv">Arquivo CSV</TabsTrigger>
                  <TabsTrigger value="sheets">Google Sheets</TabsTrigger>
                </TabsList>
                <TabsContent value="csv" className="space-y-4">
                  <CSVImport
                    onImportComplete={() => {
                      setIsImportDialogOpen(false)
                      onUpdateTabs()
                    }}
                  />
                </TabsContent>
                <TabsContent value="sheets" className="space-y-4">
                  <GoogleSheetsImport
                    onImportComplete={() => {
                      setIsImportDialogOpen(false)
                      onUpdateTabs()
                    }}
                  />
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>

          {/* Create Tab Button */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                <span>Nova Aba</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Aba</DialogTitle>
                <DialogDescription>
                  Crie uma nova aba para organizar seus dados. Você pode adicionar colunas personalizadas depois.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="tab-name">Nome da Aba</Label>
                  <Input
                    id="tab-name"
                    placeholder="Digite o nome da aba..."
                    value={newTabName}
                    onChange={(e) => setNewTabName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tab-type">Tipo de Dashboard</Label>
                  <Select value={newTabType} onValueChange={(value: "rollout" | "testing") => setNewTabType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rollout">
                        <div className="flex items-center space-x-2">
                          <Table className="w-4 h-4 text-green-600" />
                          <span>Rollout</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="testing">
                        <div className="flex items-center space-x-2">
                          <TestTube className="w-4 h-4 text-purple-600" />
                          <span>Testes</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isLoading}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateTab} disabled={isLoading}>
                  {isLoading ? "Criando..." : "Criar Aba"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs Grid */}
      {tabs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Table className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma aba encontrada</h3>
            <p className="text-gray-600 mb-6">Crie sua primeira aba ou importe dados para começar.</p>
            <div className="flex justify-center space-x-3">
              <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Aba
              </Button>
              <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                <FileUp className="w-4 h-4 mr-2" />
                Importar Dados
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab
            const isRollout = (tab.dashboardType || "rollout") === "rollout"

            return (
              <Card
                key={tab.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isActive ? "ring-2 ring-blue-500 shadow-md" : ""
                }`}
                onClick={() => onSetActiveTab(tab.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <div
                          className={`w-3 h-3 rounded-full flex-shrink-0 ${
                            isRollout ? "bg-green-500" : "bg-purple-500"
                          }`}
                        />
                        <h4 className="font-semibold text-gray-900 truncate">{tab.name}</h4>
                      </div>

                      <div className="flex items-center space-x-2 mb-3">
                        <Badge variant={isRollout ? "default" : "secondary"} className="text-xs">
                          {isRollout ? (
                            <>
                              <Table className="w-3 h-3 mr-1" />
                              Rollout
                            </>
                          ) : (
                            <>
                              <TestTube className="w-3 h-3 mr-1" />
                              Testes
                            </>
                          )}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {Array.isArray(tab.rows) ? tab.rows.length : 0} registros
                        </span>
                      </div>

                      {isActive && (
                        <div className="flex items-center space-x-1 text-xs text-blue-600">
                          <Eye className="w-3 h-3" />
                          <span>Aba ativa</span>
                        </div>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            onSetActiveTab(tab.id)
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleShareTab(tab.id)
                          }}
                        >
                          <Share2 className="w-4 h-4 mr-2" />
                          Compartilhar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleExportTab(tab)
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Exportar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            openEditDialog(tab)
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteTab(tab.id, tab.name)
                          }}
                          className="text-red-600 focus:text-red-600"
                          disabled={isLoading}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit Tab Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Aba</DialogTitle>
            <DialogDescription>Modifique as informações da aba selecionada.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-tab-name">Nome da Aba</Label>
              <Input
                id="edit-tab-name"
                placeholder="Digite o nome da aba..."
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tab-type">Tipo de Dashboard</Label>
              <Select value={newTabType} onValueChange={(value: "rollout" | "testing") => setNewTabType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rollout">
                    <div className="flex items-center space-x-2">
                      <Table className="w-4 h-4 text-green-600" />
                      <span>Rollout</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="testing">
                    <div className="flex items-center space-x-2">
                      <TestTube className="w-4 h-4 text-purple-600" />
                      <span>Testes</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleEditTab} disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
