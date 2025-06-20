"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BarChart3, Settings, Share2, Edit3, Trash2 } from "lucide-react"
import { OptimizedSpreadsheetTable } from "../components/optimized-spreadsheet-table"
import { EnhancedDashboard } from "../components/enhanced-dashboard"
import { HeroSection } from "../components/hero-section"
import { ClientOnly } from "../components/client-only"
import { useOptimizedData } from "../hooks/useOptimizedData"
import { LoadingSpinner } from "../components/loading-spinner"
import { Footer } from "../components/footer"
import type { DashboardData } from "../types"
import Link from "next/link"
import { toast } from "sonner"
import { GoogleSheetsImport } from "../components/google-sheets-import"
import { CSVImport } from "../components/csv-import"
import { updateTabAction, deleteTabAction } from "./actions"

export default function AcompanhamentoApp() {
  const { tabs, loading, refreshData } = useOptimizedData()
  const [activeTab, setActiveTab] = useState("")
  const [showDashboard, setShowDashboard] = useState<string | null>(null)
  const [editingTabName, setEditingTabName] = useState<string | null>(null)
  const [tempTabName, setTempTabName] = useState("")

  // Set active tab when tabs are loaded
  useEffect(() => {
    if (!activeTab && tabs.length > 0) {
      setActiveTab(tabs[0].id)
    }
  }, [activeTab, tabs])

  // Load Google API script after component mounts
  useEffect(() => {
    if (typeof window !== "undefined" && !document.querySelector('script[src*="gsi/client"]')) {
      const script = document.createElement("script")
      script.src = "https://accounts.google.com/gsi/client"
      script.async = true
      document.head.appendChild(script)
    }
  }, [])

  const currentTab = tabs.find((t) => t.id === activeTab)

  const generateDashboardData = (tabData: any): DashboardData => {
    const statusCounts: { [key: string]: number } = {}

    tabData.rows.forEach((row: any) => {
      const status = row.status || "Sem Status"
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })

    return {
      tabId: tabData.id,
      tabName: tabData.name,
      statusCounts,
      totalRecords: tabData.rows.length,
      recentActivity: tabData.rows.slice().reverse(), // Todos os registros para o dashboard
    }
  }

  const openDashboard = (tabId: string) => {
    setShowDashboard(tabId)
  }

  const closeDashboard = () => {
    setShowDashboard(null)
  }

  const shareTab = (tabId: string) => {
    const shareUrl = `${window.location.origin}/share/${tabId}`
    navigator.clipboard.writeText(shareUrl)
    toast.success("Link de compartilhamento copiado!")
  }

  const startEditTabName = () => {
    if (currentTab) {
      setTempTabName(currentTab.name)
      setEditingTabName(currentTab.id)
    }
  }

  const updateTabName = async (newName: string) => {
    if (newName.trim() && newName !== currentTab?.name && currentTab) {
      try {
        const result = await updateTabAction({
          id: currentTab.id,
          name: newName.trim(),
          columns: currentTab.columns,
        })
        if (result.success) {
          toast.success("Nome da aba atualizado!")
          refreshData()
        } else {
          toast.error("Erro ao atualizar nome da aba")
        }
      } catch (error) {
        toast.error("Erro ao atualizar nome da aba")
      }
    }
    setEditingTabName(null)
  }

  const deleteTab = async (tabId: string) => {
    if (tabs.length > 1) {
      try {
        const result = await deleteTabAction(tabId)
        if (result.success) {
          toast.success("Aba removida com sucesso!")
          if (activeTab === tabId) {
            setActiveTab(tabs.filter((t) => t.id !== tabId)[0].id)
          }
          refreshData()
        } else {
          toast.error("Erro ao remover aba")
        }
      } catch (error) {
        toast.error("Erro ao remover aba")
      }
    }
  }

  if (loading && tabs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600">Carregando dados do sistema...</p>
        </div>
      </div>
    )
  }

  if (showDashboard) {
    const tabData = tabs.find((tab) => tab.id === showDashboard)
    if (tabData) {
      const dashboardData = generateDashboardData(tabData)
      return (
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">
            <EnhancedDashboard data={dashboardData} onBack={closeDashboard} />
          </div>
          <Footer />
        </div>
      )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex flex-col">
      <div className="flex-1">
        {/* Hero Section */}
        <HeroSection />

        {/* Main Content */}
        <div className="container mx-auto p-6 space-y-6">
          <ClientOnly
            fallback={
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            }
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              {/* Compact Header with Tabs and Actions */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="space-y-4">
                  {/* Tabs Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <TabsList className="inline-flex h-12 items-center justify-start rounded-xl bg-gradient-to-r from-slate-50 to-gray-50 p-1 text-muted-foreground shadow-inner border border-gray-200/60 overflow-x-auto backdrop-blur-sm">
                        <div className="flex items-center space-x-1 min-w-max">
                          {tabs.map((tab) => (
                            <TabsTrigger
                              key={tab.id}
                              value={tab.id}
                              className="group relative inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-md data-[state=active]:shadow-blue-500/10 data-[state=active]:border data-[state=active]:border-blue-200/50 hover:bg-white/70 hover:text-gray-700 hover:shadow-sm transform hover:scale-[1.02] data-[state=active]:scale-[1.02]"
                            >
                              <div className="flex items-center space-x-2">
                                <div
                                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                    tab.id === activeTab
                                      ? "bg-blue-500 shadow-lg shadow-blue-500/50"
                                      : "bg-gray-300 group-hover:bg-gray-400"
                                  }`}
                                />
                                <span className="relative font-semibold">
                                  {tab.name}
                                  {tab.rows.length > 0 && (
                                    <span
                                      className={`ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full transition-all duration-300 ${
                                        tab.id === activeTab
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-gray-200 text-gray-600 group-hover:bg-gray-300"
                                      }`}
                                    >
                                      {tab.rows.length}
                                    </span>
                                  )}
                                </span>
                              </div>
                            </TabsTrigger>
                          ))}
                        </div>
                      </TabsList>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="outline"
                        onClick={() => shareTab(activeTab)}
                        disabled={!activeTab}
                        className="h-9 px-3 text-emerald-700 hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300 group transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <Share2 className="w-4 h-4 mr-1 group-hover:scale-110 transition-transform" />
                        Compartilhar
                      </Button>
                      <Link href="/admin">
                        <Button
                          variant="outline"
                          className="h-9 px-3 hover:bg-gray-50 shadow-sm hover:shadow-md transition-all duration-200 border-gray-200 hover:border-gray-300 group"
                        >
                          <Settings className="w-4 h-4 mr-1 group-hover:rotate-90 transition-transform duration-300" />
                          Admin
                        </Button>
                      </Link>
                      <Button
                        onClick={() => openDashboard(activeTab)}
                        className="h-9 px-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 group"
                        disabled={!activeTab}
                      >
                        <BarChart3 className="w-4 h-4 mr-1 group-hover:scale-110 transition-transform" />
                        Dashboard
                      </Button>
                    </div>
                  </div>

                  {/* Tab Management Row */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center space-x-4">
                      {/* Tab Name Editor */}
                      {currentTab && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Aba:</span>
                          {editingTabName === currentTab.id ? (
                            <div className="flex items-center space-x-2">
                              <Input
                                value={tempTabName}
                                onChange={(e) => setTempTabName(e.target.value)}
                                onBlur={() => updateTabName(tempTabName)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    updateTabName(tempTabName)
                                  } else if (e.key === "Escape") {
                                    setEditingTabName(null)
                                  }
                                }}
                                className="h-8 w-48 text-sm"
                                autoFocus
                                placeholder="Nome da aba"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">"{currentTab.name}"</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={startEditTabName}
                                className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all duration-200 transform hover:scale-105"
                              >
                                <Edit3 className="w-3 h-3 transition-transform group-hover:rotate-12" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Import Actions */}
                      <GoogleSheetsImport onImportComplete={refreshData} />
                      <CSVImport onImportComplete={refreshData} />

                      {/* Tab Actions */}
                      {tabs.length > 1 && currentTab && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteTab(currentTab.id)}
                          className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md"
                        >
                          <Trash2 className="w-3 h-3 mr-1 transition-transform group-hover:scale-110" />
                          Excluir
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {tabs.map((tab) => (
                <TabsContent key={tab.id} value={tab.id} className="space-y-6">
                  <OptimizedSpreadsheetTable tabData={tab} onRefresh={refreshData} />
                </TabsContent>
              ))}
            </Tabs>
          </ClientOnly>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}
