"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Edit2, Trash2, Plus, Check, X } from "lucide-react"
import { GoogleSheetsImport } from "./google-sheets-import"
import { toast } from "sonner"
import { createTabAction, updateTabAction, deleteTabAction } from "../app/actions"
import type { TabData, Column } from "../types"

interface TabManagerProps {
  tabs: TabData[]
  onUpdateTabs: () => void
  activeTab: string
  onSetActiveTab: (tabId: string) => void
  showActions?: boolean // Para controlar se é admin ou página principal
}

export function TabManager({ tabs, onUpdateTabs, activeTab, onSetActiveTab, showActions = false }: TabManagerProps) {
  const [isCreatingTab, setIsCreatingTab] = useState(false)
  const [newTabName, setNewTabName] = useState("")
  const [editingTab, setEditingTab] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")

  const currentTab = tabs.find((t) => t.id === activeTab)

  const createNewTab = async () => {
    if (!newTabName.trim()) {
      toast.error("Digite um nome para a nova aba")
      return
    }

    try {
      const defaultColumns: Column[] = [
        { key: "loja", label: "Loja", type: "text", width: 250 },
        { key: "total_totens", label: "Total de Totens", type: "text", width: 150 },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: ["Pendente", "Em Andamento", "Concluído", "Cancelado"],
          width: 150,
        },
        { key: "observacao", label: "Observação", type: "text", width: 300 },
      ]

      const newTab: TabData = {
        id: `tab-${Date.now()}`,
        name: newTabName.trim(),
        columns: defaultColumns,
        rows: [],
        dashboardType: "rollout",
      }

      const result = await createTabAction(newTab)

      if (result.success) {
        toast.success("Nova aba criada com sucesso!")
        setNewTabName("")
        setIsCreatingTab(false)
        onUpdateTabs()
        onSetActiveTab(newTab.id)
      } else {
        toast.error("Erro ao criar nova aba")
      }
    } catch (error) {
      console.error("Error creating tab:", error)
      toast.error("Erro ao criar nova aba")
    }
  }

  const startEditTab = (tab: TabData) => {
    setEditingTab(tab.id)
    setEditingName(tab.name)
  }

  const saveTabName = async (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab || !editingName.trim()) return

    try {
      const result = await updateTabAction({
        ...tab,
        name: editingName.trim(),
      })

      if (result.success) {
        toast.success("Nome da aba atualizado!")
        setEditingTab(null)
        onUpdateTabs()
      } else {
        toast.error("Erro ao atualizar nome da aba")
      }
    } catch (error) {
      toast.error("Erro ao atualizar nome da aba")
    }
  }

  const cancelEdit = () => {
    setEditingTab(null)
    setEditingName("")
  }

  const deleteTab = async (tabId: string) => {
    if (tabs.length <= 1) {
      toast.error("Não é possível deletar a última aba")
      return
    }

    try {
      const result = await deleteTabAction(tabId)

      if (result.success) {
        toast.success("Aba deletada com sucesso!")
        if (activeTab === tabId) {
          const remainingTabs = tabs.filter((t) => t.id !== tabId)
          onSetActiveTab(remainingTabs[0].id)
        }
        onUpdateTabs()
      } else {
        toast.error("Erro ao deletar aba")
      }
    } catch (error) {
      toast.error("Erro ao deletar aba")
    }
  }

  // Se não é para mostrar ações (página principal), só mostra a seção da aba atual
  if (!showActions) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">Aba:</span>
            <span
              className={`font-medium text-gray-900 transition-all duration-300 ${
                editingTab === currentTab?.id ? "text-blue-600 scale-105" : "hover:text-blue-600"
              }`}
            >
              "{currentTab?.name}"
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (currentTab) {
                  setEditingTab(currentTab.id)
                  setEditingName(currentTab.name)
                }
              }}
              className={`h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 hover:border-blue-300 group transition-all duration-300 ${
                editingTab === currentTab?.id ? "scale-110 bg-blue-50 border-blue-300 shadow-md" : "hover:scale-110"
              }`}
            >
              <Edit2
                className={`w-3 h-3 mr-1 transition-transform duration-300 ${
                  editingTab === currentTab?.id ? "rotate-12 scale-125" : "group-hover:rotate-12"
                }`}
              />
              <span className="group-hover:scale-105 transition-transform duration-200">Editar Nome</span>
            </Button>
          </div>

          <div className="flex items-center space-x-2 relative">
            {/* BOTÃO PARA CRIAR NOVA ABA */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreatingTab(true)}
              className="h-7 px-3 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 hover:border-green-300 hover:scale-110 hover:shadow-md transition-all duration-300 group"
            >
              <Plus className="w-3 h-3 mr-1 group-hover:rotate-90 transition-transform duration-200" />
              <span className="group-hover:scale-105 transition-transform duration-200">Nova Aba</span>
            </Button>

            {/* Modal inline para criar nova aba */}
            {isCreatingTab && (
              <div className="absolute top-full left-0 mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[300px]">
                <div className="flex items-center space-x-2">
                  <Input
                    value={newTabName}
                    onChange={(e) => setNewTabName(e.target.value)}
                    placeholder="Nome da nova aba..."
                    className="h-8 flex-1 focus:scale-105 transition-transform duration-200"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") createNewTab()
                      if (e.key === "Escape") {
                        setIsCreatingTab(false)
                        setNewTabName("")
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={createNewTab}
                    className="h-8 px-3 bg-green-600 hover:bg-green-700 hover:scale-110 transition-all duration-200"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsCreatingTab(false)
                      setNewTabName("")
                    }}
                    className="h-8 px-3 hover:scale-110 transition-all duration-200"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            <GoogleSheetsImport onImportComplete={onUpdateTabs} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (currentTab) deleteTab(currentTab.id)
              }}
              className="h-7 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 hover:scale-110 hover:shadow-md transition-all duration-300 group"
              disabled={tabs.length <= 1}
            >
              <Trash2 className="w-3 h-3 mr-1 group-hover:rotate-12 transition-transform duration-200" />
              <span className="group-hover:scale-105 transition-transform duration-200">Excluir</span>
            </Button>
          </div>
        </div>

        {/* Modal de edição inline */}
        {editingTab === currentTab?.id && (
          <div className="mt-3 pt-3 border-t border-gray-200 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center space-x-2">
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="h-8 flex-1 focus:scale-105 focus:shadow-lg transition-all duration-300 animate-pulse"
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTabName(currentTab.id)
                  if (e.key === "Escape") cancelEdit()
                }}
                autoFocus
                placeholder="Nome da aba"
              />
              <Button
                size="sm"
                onClick={() => saveTabName(currentTab.id)}
                className="h-8 hover:scale-125 hover:shadow-lg transition-all duration-300 group bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={cancelEdit}
                className="h-8 hover:scale-125 hover:shadow-lg transition-all duration-300 group"
              >
                <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Versão completa para admin (showActions=true)
  return (
    <div className="space-y-8">
      {/* Existing Tabs */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Abas Existentes</h3>
          <Badge variant="secondary" className="text-sm hover:scale-105 transition-transform duration-200">
            {tabs.length} {tabs.length === 1 ? "aba" : "abas"}
          </Badge>
        </div>

        <div className="space-y-4">
          {tabs.map((tab) => {
            const isRollout = (tab.dashboardType || "rollout") === "rollout"

            return (
              <div
                key={tab.id}
                className="flex items-center justify-between py-2 hover:scale-[1.02] transition-transform duration-200"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${isRollout ? "bg-green-500 shadow-lg shadow-green-500/50" : "bg-purple-500 shadow-lg shadow-purple-500/50"}`}
                  />

                  {editingTab === tab.id ? (
                    <div className="flex items-center space-x-2 animate-in slide-in-from-left-2 duration-300">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-8 w-48 focus:scale-110 focus:shadow-lg transition-all duration-300 animate-pulse"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveTabName(tab.id)
                          if (e.key === "Escape") cancelEdit()
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => saveTabName(tab.id)}
                        className="h-8 w-8 p-0 hover:scale-125 hover:shadow-lg transition-all duration-300 group"
                      >
                        <Check className="w-4 h-4 text-green-600 group-hover:scale-110 transition-transform duration-200" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEdit}
                        className="h-8 w-8 p-0 hover:scale-125 hover:shadow-lg transition-all duration-300 group"
                      >
                        <X className="w-4 h-4 text-red-600 group-hover:rotate-90 transition-transform duration-200" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-gray-900 hover:text-blue-600 hover:scale-105 transition-all duration-200">
                        {tab.name}
                      </span>
                      <Badge
                        variant="default"
                        className="bg-blue-600 text-white text-xs hover:scale-105 transition-transform duration-200"
                      >
                        {isRollout ? "Rollout de Sistema" : "Testes de Integração"}
                      </Badge>
                      <span className="text-sm text-gray-500">• {tab.rows.length} registros</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {editingTab !== tab.id && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditTab(tab)}
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 hover:scale-125 hover:shadow-lg transition-all duration-300 group"
                      >
                        <Edit2 className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteTab(tab.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 hover:scale-125 hover:shadow-lg transition-all duration-300 group"
                        disabled={tabs.length <= 1}
                      >
                        <Trash2 className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Create New Tab */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Criar Nova Aba</h3>

        {isCreatingTab ? (
          <div className="p-4 border-2 border-dashed border-blue-300 bg-blue-50/30 rounded-lg animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center space-x-3">
              <Input
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                placeholder="Nome da nova aba..."
                className="flex-1 focus:scale-105 focus:shadow-lg transition-all duration-300 animate-pulse"
                onKeyDown={(e) => {
                  if (e.key === "Enter") createNewTab()
                  if (e.key === "Escape") {
                    setIsCreatingTab(false)
                    setNewTabName("")
                  }
                }}
                autoFocus
              />
              <Button
                onClick={createNewTab}
                size="sm"
                className="hover:scale-110 hover:shadow-lg transition-all duration-300 group bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                Criar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsCreatingTab(false)
                  setNewTabName("")
                }}
                className="hover:scale-110 hover:shadow-lg transition-all duration-300 group"
              >
                <span className="group-hover:scale-105 transition-transform duration-200">Cancelar</span>
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 hover:scale-105 hover:shadow-lg transition-all duration-300 cursor-pointer group"
            onClick={() => setIsCreatingTab(true)}
          >
            <Plus className="w-6 h-6 mx-auto mb-2 text-gray-400 group-hover:rotate-90 group-hover:scale-125 transition-all duration-300" />
            <span className="text-gray-600 group-hover:text-blue-600 group-hover:scale-105 transition-all duration-200">
              Criar Nova Aba
            </span>
          </div>
        )}
      </div>

      {/* Import Data */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Importar Dados</h3>
        <div className="mb-3">
          <GoogleSheetsImport onImportComplete={onUpdateTabs} />
        </div>
        <p className="text-sm text-gray-500">
          Importe dados diretamente do Google Sheets para criar uma nova aba automaticamente.
        </p>
      </div>
    </div>
  )
}
