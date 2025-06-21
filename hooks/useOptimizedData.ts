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
      const data = await getTabsAction()

      // Garantir que data é um array
      if (Array.isArray(data)) {
        setTabs(data)
      } else {
        console.error("getTabsAction did not return an array:", data)
        setTabs([])
      }

      setLastUpdate(new Date())
    } catch (error) {
      console.error("Error fetching data:", error)
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
