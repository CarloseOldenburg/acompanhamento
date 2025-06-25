"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { BarChart3, Settings, Share2, Crown } from "lucide-react"
import { EnhancedSpreadsheetTable } from "../components/enhanced-spreadsheet-table"
import { EnhancedDashboard } from "../components/enhanced-dashboard"
import { ExecutiveDashboard } from "../components/executive-dashboard"
import { HeroSection } from "../components/hero-section"
import { ClientOnly } from "../components/client-only"
import { useOptimizedData } from "../hooks/useOptimizedData"
import { LoadingSpinner } from "../components/loading-spinner"
import { Footer } from "../components/footer"
import type { DashboardData } from "../types"
import Link from "next/link"
import { toast } from "sonner"
import { TabManager } from "../components/tab-manager"

export default function AcompanhamentoApp() {
  const { tabs, loading, refreshData } = useOptimizedData()
  const [activeTab, setActiveTab] = useState("")
  const [showDashboard, setShowDashboard] = useState<string | null>(null)
  const [dashboardType, setDashboardType] = useState<"enhanced" | "executive">("enhanced")

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
      recentActivity: tabData.rows,
      dashboardType: tabData.dashboardType || "rollout",
    }
  }

  const openDashboard = (tabId: string, type: "enhanced" | "executive" = "enhanced") => {
    setDashboardType(type)
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
      return (
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">
            {dashboardType === "executive" ? (
              <ExecutiveDashboard data={dashboardData} onBack={closeDashboard} />
            ) : (
              <EnhancedDashboard data={dashboardData} onBack={closeDashboard} />
            )}
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
                          {tabs.map((tab) => {
                            const tabType = tab.dashboardType || "rollout"
                            const isRollout = tabType === "rollout"

                            return (
                              <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                className="group relative inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-md data-[state=active]:shadow-blue-500/10 data-[state=active]:border data-[state=active]:border-blue-200/50 hover:bg-white/70 hover:text-gray-700 hover:shadow-sm transform hover:scale-[1.02] data-[state=active]:scale-[1.02]"
                              >
                                <div className="flex items-center space-x-2">
                                  <div
                                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                      tab.id === activeTab
                                        ? isRollout
                                          ? "bg-green-500 shadow-lg shadow-green-500/50"
                                          : "bg-purple-500 shadow-lg shadow-purple-500/50"
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
                            )
                          })}
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
                        onClick={() => openDashboard(activeTab, "executive")}
                        className="h-9 px-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 group"
                        disabled={!activeTab}
                      >
                        <Crown className="w-4 h-4 mr-1 group-hover:scale-110 transition-transform" />
                        Executivo
                      </Button>
                      <Button
                        onClick={() => openDashboard(activeTab, "enhanced")}
                        className="h-9 px-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 group"
                        disabled={!activeTab}
                      >
                        <BarChart3 className="w-4 h-4 mr-1 group-hover:scale-110 transition-transform" />
                        Dashboard
                      </Button>
                    </div>
                  </div>

                  {/* Tab Management Section */}
                  <TabManager
                    tabs={tabs}
                    onUpdateTabs={refreshData}
                    activeTab={activeTab}
                    onSetActiveTab={setActiveTab}
                  />
                </div>
              </div>

              {tabs.map((tab) => (
                <TabsContent key={tab.id} value={tab.id} className="space-y-6">
                  <EnhancedSpreadsheetTable tabData={tab} onRefresh={refreshData} />
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
