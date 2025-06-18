"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Settings, Trash2 } from "lucide-react"
import type { TabData, Column } from "../types"

interface TabManagerProps {
  tabs: TabData[]
  onUpdateTabs: (tabs: TabData[]) => void
  activeTab: string
  onSetActiveTab: (tabId: string) => void
}

export function TabManager({ tabs, onUpdateTabs, activeTab, onSetActiveTab }: TabManagerProps) {
  const [showAddTab, setShowAddTab] = useState(false)
  const [showEditTab, setShowEditTab] = useState<string | null>(null)
  const [newTabName, setNewTabName] = useState("")
  const [editingColumns, setEditingColumns] = useState<Column[]>([])

  const addNewTab = () => {
    if (newTabName.trim()) {
      const newTab: TabData = {
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
        rows: [],
      }
      onUpdateTabs([...tabs, newTab])
      setNewTabName("")
      setShowAddTab(false)
      onSetActiveTab(newTab.id)
    }
  }

  const deleteTab = (tabId: string) => {
    if (tabs.length > 1) {
      const updatedTabs = tabs.filter((tab) => tab.id !== tabId)
      onUpdateTabs(updatedTabs)
      if (activeTab === tabId) {
        onSetActiveTab(updatedTabs[0].id)
      }
    }
  }

  const startEditTab = (tab: TabData) => {
    setEditingColumns([...tab.columns])
    setShowEditTab(tab.id)
  }

  const saveTabEdit = () => {
    if (showEditTab) {
      const updatedTabs = tabs.map((tab) => (tab.id === showEditTab ? { ...tab, columns: editingColumns } : tab))
      onUpdateTabs(updatedTabs)
      setShowEditTab(null)
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
    setEditingColumns(editingColumns.filter((_, i) => i !== index))
  }

  return (
    <div className="flex items-center space-x-2">
      <Dialog open={showAddTab} onOpenChange={setShowAddTab}>
        <DialogTrigger asChild>
          <Button variant="outline" className="border-dashed">
            <Plus className="w-4 h-4 mr-2" />
            Nova Aba
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Nova Aba</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="tab-name">Nome da Aba</Label>
              <Input
                id="tab-name"
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                placeholder="Digite o nome da nova aba"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddTab(false)}>
                Cancelar
              </Button>
              <Button onClick={addNewTab} disabled={!newTabName.trim()}>
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showEditTab} onOpenChange={() => setShowEditTab(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Colunas da Aba</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Colunas</h4>
              <Button onClick={addColumn} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Coluna
              </Button>
            </div>

            <div className="space-y-3">
              {editingColumns.map((column, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 border rounded">
                  <div className="col-span-3">
                    <Label className="text-xs">Nome</Label>
                    <Input
                      value={column.label}
                      onChange={(e) => updateColumn(index, "label", e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Chave</Label>
                    <Input
                      value={column.key}
                      onChange={(e) => updateColumn(index, "key", e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Tipo</Label>
                    <Select value={column.type} onValueChange={(value) => updateColumn(index, "type", value)}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="select">Seleção</SelectItem>
                        <SelectItem value="date">Data</SelectItem>
                        <SelectItem value="datetime">Data/Hora</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Largura</Label>
                    <Input
                      type="number"
                      value={column.width || 150}
                      onChange={(e) => updateColumn(index, "width", Number.parseInt(e.target.value))}
                      className="h-8"
                    />
                  </div>
                  <div className="col-span-2">
                    {column.type === "select" && (
                      <>
                        <Label className="text-xs">Opções</Label>
                        <Input
                          value={column.options?.join(", ") || ""}
                          onChange={(e) => updateColumn(index, "options", e.target.value.split(", "))}
                          placeholder="Op1, Op2, Op3"
                          className="h-8"
                        />
                      </>
                    )}
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeColumn(index)}
                      className="h-8 w-8 p-0 text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowEditTab(null)}>
                Cancelar
              </Button>
              <Button onClick={saveTabEdit}>Salvar Alterações</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {tabs.map((tab) => (
        <div key={tab.id} className="flex items-center space-x-1">
          {tab.id === activeTab && (
            <>
              <Button variant="ghost" size="sm" onClick={() => startEditTab(tab)} className="h-8 w-8 p-0">
                <Settings className="w-3 h-3" />
              </Button>
              {tabs.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteTab(tab.id)}
                  className="h-8 w-8 p-0 text-red-500"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  )
}
