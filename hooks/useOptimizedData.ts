"use client"

import { useState, useEffect, useCallback } from "react"
import { getTabsAction } from "../app/actions"
import type { TabData } from "../types"

interface UseOptimizedDataReturn {
  tabs: TabData[]
  loading: boolean
  error: string | null
  refreshData: () => Promise<void>
}

export function useOptimizedData(): UseOptimizedDataReturn {
  const [tabs, setTabs] = useState<TabData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTabs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await getTabsAction()

      if (result.success && Array.isArray(result.data)) {
        // Validar e filtrar dados válidos
        const validTabs = result.data.filter((tab): tab is TabData => {
          return (
            tab &&
            typeof tab === "object" &&
            typeof tab.id === "string" &&
            typeof tab.name === "string" &&
            Array.isArray(tab.rows) &&
            Array.isArray(tab.columns)
          )
        })

        setTabs(validTabs)
      } else {
        console.warn("⚠️ Invalid tabs data received:", result)
        setTabs([])
        if (!result.success) {
          setError(result.error || "Erro ao carregar dados")
        }
      }
    } catch (err) {
      console.error("❌ Error loading tabs:", err)
      setError(err instanceof Error ? err.message : "Erro inesperado ao carregar dados")
      setTabs([])
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshData = useCallback(async () => {
    await loadTabs()
  }, [loadTabs])

  useEffect(() => {
    loadTabs()
  }, [loadTabs])

  return {
    tabs,
    loading,
    error,
    refreshData,
  }
}
