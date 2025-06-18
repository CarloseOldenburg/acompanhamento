"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { BarChart3, Settings, Share2 } from "lucide-react"
import { OptimizedSpreadsheetTable } from "../components/optimized-spreadsheet-table"
import { EnhancedDashboard } from "../components/enhanced-dashboard"
import { HeroSection } from "../components/hero-section"
import { TabManager } from "../components/tab-manager"
import { ClientOnly } from "../components/client-only"
import { useOptimizedData } from "../hooks/useOptimizedData"
import { LoadingSpinner } from "../components/loading-spinner"
import type { DashboardData } from "../types"
import Link from "next/link"
import { toast } from "sonner"
import { GoogleSheetsImport } from "../components/google-sheets-import"

export default function AcompanhamentoApp() {
  const { tabs, loading, refreshData } = useOptimizedData()
  const [activeTab, setActiveTab] = useState("")
  const [showDashboard, setShowDashboard] = useState<string | null>(null)

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
      recentActivity: tabData.rows.slice(-10).reverse(),
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
      return <EnhancedDashboard data={dashboardData} onBack={closeDashboard} />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* Hero Section */}
      <HeroSection />

      {/* Main Content */}
      <div className="container mx-auto p-6 space-y-8">
        <ClientOnly
          fallback={
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          }
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <div className="flex flex-col gap-6">
                {/* Tabs Row */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="relative">
                      <TabsList className="inline-flex h-14 items-center justify-start rounded-2xl bg-gradient-to-r from-slate-50 to-gray-50 p-2 text-muted-foreground shadow-inner border border-gray-200/60 w-full overflow-x-auto backdrop-blur-sm">
                        <div className="flex items-center space-x-2 min-w-max">
                          {tabs.map((tab) => (
                            <TabsTrigger
                              key={tab.id}
                              value={tab.id}
                              className="group relative inline-flex items-center justify-center whitespace-nowrap rounded-xl px-6 py-3 text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/10 data-[state=active]:border data-[state=active]:border-blue-200/50 hover:bg-white/70 hover:text-gray-700 hover:shadow-md transform hover:scale-[1.02] data-[state=active]:scale-[1.02]"
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
                              {tab.id === activeTab && (
                                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-lg"></div>
                              )}
                            </TabsTrigger>
                          ))}
                        </div>
                      </TabsList>

                      {/* Gradient fade for overflow */}
                      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none rounded-r-2xl"></div>
                    </div>
                  </div>
                </div>

                {/* Actions Row - Separated into two groups */}
                <div className="flex flex-wrap justify-between gap-4">
                  {/* Left side actions */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <GoogleSheetsImport onImportComplete={refreshData} />

                    <TabManager
                      tabs={tabs}
                      onUpdateTabs={() => refreshData()}
                      activeTab={activeTab}
                      onSetActiveTab={setActiveTab}
                    />
                  </div>

                  {/* Right side actions */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button
                      variant="outline"
                      onClick={() => shareTab(activeTab)}
                      disabled={!activeTab}
                      className="shadow-sm hover:shadow-md transition-all duration-200 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 group"
                    >
                      <Share2 className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                      Compartilhar
                    </Button>
                    <Link href="/admin">
                      <Button
                        variant="outline"
                        className="shadow-sm hover:shadow-md transition-all duration-200 border-gray-200 hover:border-gray-300 group"
                      >
                        <Settings className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                        Admin
                      </Button>
                    </Link>
                    <Button
                      onClick={() => openDashboard(activeTab)}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 group"
                      disabled={!activeTab}
                    >
                      <BarChart3 className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                      Ver Dashboard
                    </Button>
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
  )
}
