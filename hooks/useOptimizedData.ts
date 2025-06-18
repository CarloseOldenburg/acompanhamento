"use client"

import { useState, useEffect, useCallback } from "react"
import type { TabData } from "../types"
import { getTabsAction } from "../app/actions"

export function useOptimizedData() {
  const [tabs, setTabs] = useState<TabData[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)

  // Ensure component is mounted before doing anything
  useEffect(() => {
    setMounted(true)
  }, [])

  const refreshData = useCallback(async () => {
    if (!mounted) return

    try {
      setLoading(true)
      const data = await getTabsAction()
      setTabs(data)
      setLastUpdate(new Date())
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }, [mounted])

  useEffect(() => {
    if (!mounted) return

    refreshData()

    // Refresh data every 30 seconds (optimized interval)
    const interval = setInterval(refreshData, 30000)

    return () => clearInterval(interval)
  }, [refreshData, mounted])

  return {
    tabs,
    loading,
    lastUpdate,
    refreshData,
  }
}
