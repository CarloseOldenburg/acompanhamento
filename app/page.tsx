"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { BarChart3 } from "lucide-react"
import { SpreadsheetTable } from "../components/spreadsheet-table"
import { Dashboard } from "../components/dashboard"
import { useLocalStorage } from "../hooks/useLocalStorage"
import type { TabData, DashboardData } from "../types"
import { TabManager } from "../components/tab-manager"

const initialTabs: TabData[] = [
  {
    id: "testes-integracao",
    name: "Testes de Integração",
    columns: [
      { key: "restaurante", label: "Nome do Restaurante", type: "text", width: 200 },
      { key: "telefone", label: "Telefone do Cliente", type: "text", width: 150 },
      { key: "solicitante", label: "Solicitante", type: "text", width: 150 },
      { key: "merchantId", label: "Merchant ID Totem", type: "text", width: 180 },
      { key: "integradora", label: "PDV / Integradora", type: "text", width: 150 },
      { key: "observacao", label: "Observação", type: "text", width: 300 },
      { key: "status", label: "Status", type: "select", options: ["Pendente", "Concluído", "Agendado"], width: 120 },
      { key: "dataAgendamento", label: "Data de Agendamento", type: "datetime", width: 180 },
    ],
    rows: [
      {
        id: "1",
        restaurante: "Pastéis Takeda",
        telefone: "",
        solicitante: "Larissa Oliveira",
        merchantId: "e2178d0d-3008-4707-bbf0-ea21afa084d0",
        integradora: "menu integrado",
        observacao: "Pastel de Carne R$16,90 código 5783",
        status: "Concluído",
        dataAgendamento: "",
      },
    ],
  },
  {
    id: "bobs",
    name: "Bobs",
    columns: [
      { key: "dataHora", label: "Data/Hora", type: "datetime", width: 180 },
      { key: "loja", label: "Loja", type: "text", width: 200 },
      { key: "responsavel", label: "Responsável", type: "text", width: 150 },
      { key: "versaoAtual", label: "Versão Atual", type: "text", width: 120 },
      { key: "versaoDestino", label: "Versão Destino", type: "text", width: 120 },
      {
        key: "tipoMudanca",
        label: "Tipo de Mudança",
        type: "select",
        options: ["Rollout", "Hotfix", "Migração"],
        width: 150,
      },
      { key: "observacao", label: "Observação", type: "text", width: 300 },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["Pendente", "Em Andamento", "Concluído", "Cancelado"],
        width: 120,
      },
    ],
    rows: [],
  },
  {
    id: "mania-churrasco",
    name: "Mania de Churrasco",
    columns: [
      { key: "dataHora", label: "Data/Hora", type: "datetime", width: 180 },
      { key: "unidade", label: "Unidade", type: "text", width: 200 },
      { key: "cliente", label: "Cliente", type: "text", width: 150 },
      {
        key: "tipoAtivacao",
        label: "Tipo de Ativação",
        type: "select",
        options: ["Novo Cliente", "Reativação", "Upgrade"],
        width: 150,
      },
      { key: "plano", label: "Plano", type: "text", width: 120 },
      { key: "observacao", label: "Observação", type: "text", width: 300 },
      { key: "status", label: "Status", type: "select", options: ["Pendente", "Ativo", "Inativo"], width: 120 },
      { key: "dataAtivacao", label: "Data de Ativação", type: "date", width: 150 },
    ],
    rows: [],
  },
]

export default function AcompanhamentoApp() {
  const [tabs, setTabs] = useLocalStorage<TabData[]>("acompanhamento-tabs", initialTabs)
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || "")
  const [showDashboard, setShowDashboard] = useState<string | null>(null)

  const updateTabData = (updatedTab: TabData) => {
    const updatedTabs = tabs.map((tab) => (tab.id === updatedTab.id ? updatedTab : tab))
    setTabs(updatedTabs)
  }

  const generateDashboardData = (tabData: TabData): DashboardData => {
    const statusCounts: { [key: string]: number } = {}

    tabData.rows.forEach((row) => {
      const status = row.status || "Sem Status"
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })

    return {
      tabId: tabData.id,
      tabName: tabData.name,
      statusCounts,
      totalRecords: tabData.rows.length,
      recentActivity: tabData.rows.slice(-10).reverse(),
    }
  }

  const openDashboard = (tabId: string) => {
    setShowDashboard(tabId)
  }

  const closeDashboard = () => {
    setShowDashboard(null)
  }

  if (showDashboard) {
    const tabData = tabs.find((tab) => tab.id === showDashboard)
    if (tabData) {
      const dashboardData = generateDashboardData(tabData)
      return <Dashboard data={dashboardData} onBack={closeDashboard} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sistema de Acompanhamento</h1>
          <p className="text-gray-600">Gerencie seus processos de integração, rollouts e ativações</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <TabsList
                className="grid w-fit"
                style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
              >
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id} className="px-6">
                    {tab.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabManager tabs={tabs} onUpdateTabs={setTabs} activeTab={activeTab} onSetActiveTab={setActiveTab} />
            </div>

            <Button onClick={() => openDashboard(activeTab)} className="bg-blue-600 hover:bg-blue-700">
              <BarChart3 className="w-4 h-4 mr-2" />
              Ver Dashboard
            </Button>
          </div>

          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="space-y-6">
              <SpreadsheetTable tabData={tab} onUpdateData={updateTabData} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
