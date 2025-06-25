"use client"

import { useState, useEffect, useCallback } from "react"
import type { TabData } from "../types"
import { getTabsAction } from "../app/actions"

export function useOptimizedData() {
  const [tabs, setTabs] = useState<TabData[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const refreshData = useCallback(async () => {
    try {
      setLoading(true)
      const result = await getTabsAction()

      console.log("🔄 useOptimizedData - resultado:", result)

      // Verificar se o resultado tem o formato correto
      if (result && result.success && Array.isArray(result.tabs)) {
        console.log("✅ useOptimizedData - tabs encontradas:", result.tabs.length)
        setTabs(result.tabs)
      } else if (Array.isArray(result)) {
        // Fallback para formato antigo (array direto)
        console.log("✅ useOptimizedData - formato antigo, tabs:", result.length)
        setTabs(result)
      } else {
        console.error("❌ useOptimizedData - formato inválido:", result)
        setTabs([])
      }

      setLastUpdate(new Date())
    } catch (error) {
      console.error("💥 useOptimizedData - erro:", error)
      setTabs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshData()

    // Refresh data every 30 seconds (optimized interval)
    const interval = setInterval(refreshData, 30000)

    return () => clearInterval(interval)
  }, [refreshData])

  return {
    tabs,
    loading,
    lastUpdate,
    refreshData,
  }
}
