"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Settings, Trash2, GripVertical } from "lucide-react"
import { toast } from "sonner"
import type { TabData, Column } from "../types"
import { createTabAction, updateTabAction, deleteTabAction } from "../app/actions"

interface TabManagerProps {
  tabs: TabData[]
  onUpdateTabs: () => void
  activeTab: string
  onSetActiveTab: (tabId: string) => void
}

export function TabManager({ tabs, onUpdateTabs, activeTab, onSetActiveTab }: TabManagerProps) {
  const [showAddTab, setShowAddTab] = useState(false)
  const [showEditTab, setShowEditTab] = useState<string | null>(null)
  const [newTabName, setNewTabName] = useState("")
  const [editingColumns, setEditingColumns] = useState<Column[]>([])
  const [isPending, startTransition] = useTransition()

  const addNewTab = () => {
    if (newTabName.trim()) {
      startTransition(async () => {
        const newTab: Omit<TabData, "rows"> = {
          id: `tab-${Date.now()}`,
          name: newTabName.trim(),
          columns: [
            { key: "nome", label: "Nome", type: "text", width: 200 },
            { key: "descricao", label: "Descrição", type: "text", width: 300 },
            {
              key: "status",
              label: "Status",
              type: "select",
              options: ["Pendente", "Em Andamento", "Concluído"],
              width: 120,
            },
            { key: "data", label: "Data", type: "date", width: 150 },
          ],
        }

        const result = await createTabAction(newTab)
        if (result.success) {
          toast.success("Nova aba criada com sucesso!")
          setNewTabName("")
          setShowAddTab(false)
          onSetActiveTab(newTab.id)
          onUpdateTabs()
        } else {
          toast.error("Erro ao criar nova aba")
        }
      })
    }
  }

  const deleteTab = (tabId: string) => {
    if (tabs.length > 1) {
      startTransition(async () => {
        const result = await deleteTabAction(tabId)
        if (result.success) {
          toast.success("Aba removida com sucesso!")
          if (activeTab === tabId) {
            onSetActiveTab(tabs.filter((t) => t.id !== tabId)[0].id)
          }
          onUpdateTabs()
        } else {
          toast.error("Erro ao remover aba")
        }
      })
    }
  }

  const startEditTab = (tab: TabData) => {
    setEditingColumns([...tab.columns])
    setShowEditTab(tab.id)
  }

  const saveTabEdit = () => {
    if (showEditTab) {
      startTransition(async () => {
        const tab = tabs.find((t) => t.id === showEditTab)
        if (tab) {
          const updatedTab = { ...tab, columns: editingColumns }
          const result = await updateTabAction(updatedTab)
          if (result.success) {
            toast.success("Colunas atualizadas com sucesso!")
            setShowEditTab(null)
            onUpdateTabs()
          } else {
            toast.error("Erro ao atualizar colunas")
          }
        }
      })
    }
  }

  const addColumn = () => {
    const newColumn: Column = {
      key: `col-${Date.now()}`,
      label: "Nova Coluna",
      type: "text",
      width: 150,
    }
    setEditingColumns([...editingColumns, newColumn])
  }

  const updateColumn = (index: number, field: keyof Column, value: any) => {
    const updated = [...editingColumns]
    updated[index] = { ...updated[index], [field]: value }
    setEditingColumns(updated)
  }

  const removeColumn = (index: number) => {
    if (editingColumns.length > 1) {
      setEditingColumns(editingColumns.filter((_, i) => i !== index))
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Add New Tab Button */}
      <Dialog open={showAddTab} onOpenChange={setShowAddTab}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-all duration-300 h-10 px-4 rounded-xl shadow-sm hover:shadow-md transform hover:scale-105 group"
            disabled={isPending}
          >
            <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            Nova Aba
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">Criar Nova Aba</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="tab-name" className="text-sm font-medium text-gray-700">
                Nome da Aba
              </Label>
              <Input
                id="tab-name"
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                placeholder="Ex: Novos Clientes, Projetos..."
                className="w-full"
                onKeyDown={(e) => e.key === "Enter" && addNewTab()}
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowAddTab(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button
                onClick={addNewTab}
                disabled={!newTabName.trim() || isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isPending ? "Criando..." : "Criar Aba"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tab Actions - Only show for active tab */}
      {activeTab && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const tab = tabs.find((t) => t.id === activeTab)
              if (tab) startEditTab(tab)
            }}
            className="h-10 px-4 hover:bg-gray-50 border-gray-200 hover:border-gray-300 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 group"
            disabled={isPending}
          >
            <Settings className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-300" />
            Editar Colunas
          </Button>
          {tabs.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => deleteTab(activeTab)}
              className="h-10 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 group"
              disabled={isPending}
            >
              <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </Button>
          )}
        </div>
      )}

      {/* Edit Tab Dialog */}
      <Dialog open={!!showEditTab} onOpenChange={() => setShowEditTab(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Editar Colunas - {tabs.find((t) => t.id === showEditTab)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-gray-900">Configurar Colunas</h4>
              <Button onClick={addColumn} size="sm" className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Coluna
              </Button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {editingColumns.map((column, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-1 flex justify-center">
                      <GripVertical className="w-5 h-5 text-gray-400" />
                    </div>

                    <div className="col-span-3">
                      <Label className="text-xs font-medium text-gray-700 mb-1 block">Nome da Coluna</Label>
                      <Input
                        value={column.label}
                        onChange={(e) => updateColumn(index, "label", e.target.value)}
                        className="h-9"
                        placeholder="Nome da coluna"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs font-medium text-gray-700 mb-1 block">Chave (ID)</Label>
                      <Input
                        value={column.key}
                        onChange={(e) => updateColumn(index, "key", e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                        className="h-9"
                        placeholder="chave_coluna"
                      />
                    </div>

                    <div className="col-span-2">
                      <Label className="text-xs font-medium text-gray-700 mb-1 block">Tipo</Label>
                      <Select value={column.type} onValueChange={(value) => updateColumn(index, "type", value)}>
                        <SelectTrigger className="h-9">
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
                        className="h-9"
                        min="100"
                        max="500"
                      />
                    </div>

                    <div className="col-span-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeColumn(index)}
                        disabled={editingColumns.length <= 1}
                        className="h-9 w-9 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
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
                        className="h-9"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button variant="outline" onClick={() => setShowEditTab(null)} disabled={isPending}>
                Cancelar
              </Button>
              <Button onClick={saveTabEdit} disabled={isPending} className="bg-blue-600 hover:bg-blue-700">
                {isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
