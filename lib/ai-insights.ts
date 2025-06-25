import type { DashboardData } from "../types"

export interface AIInsight {
  type: "success" | "warning" | "danger" | "info"
  title: string
  message: string
  recommendation: string
  confidence: number
  priority: "high" | "medium" | "low"
  metrics?: {
    current: number
    target: number
    trend: "up" | "down" | "stable"
  }
}

export interface AIAnalysis {
  summary: string
  insights: AIInsight[]
  predictions: {
    completionTimeEstimate: string
    riskLevel: "low" | "medium" | "high"
    nextActions: string[]
  }
  performance: {
    score: number
    trend: "improving" | "declining" | "stable"
    benchmarkComparison: string
  }
  timestamp: number
  dataHash: string
}

// Função principal que chama a API route
export async function generateAIInsights(data: DashboardData, forceRefresh = false): Promise<AIAnalysis> {
  try {
    console.log("🤖 Chamando API route para insights da IA...")

    const response = await fetch("/api/ai-insights", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data, forceRefresh }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || "Erro desconhecido na API")
    }

    // Log do tipo de análise
    if (result.fromCache) {
      console.log("🎯 Análise obtida do cache")
    } else if (result.fromLocal) {
      console.log("📊 Análise local gerada")
    } else if (result.fromAI) {
      console.log("🤖 Análise da IA gerada com sucesso")
    }

    return result.analysis
  } catch (error) {
    console.error("Erro ao chamar API de insights:", error)

    // Fallback local em caso de erro na API
    return generateFallbackAnalysis(data)
  }
}

// Função para testar conexão com OpenAI via API route
export async function testOpenAIConnection(): Promise<boolean> {
  try {
    const response = await fetch("/api/ai-insights", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          totalRecords: 1,
          statusCounts: { test: 1 },
          dashboardType: "testing",
        },
        forceRefresh: true,
      }),
    })

    if (!response.ok) {
      return false
    }

    const result = await response.json()
    return result.success && result.fromAI
  } catch (error) {
    console.error("Erro ao testar conexão OpenAI:", error)
    return false
  }
}

// Função para limpar cache via API route
export async function clearAICache(): Promise<void> {
  try {
    await fetch("/api/ai-insights", {
      method: "DELETE",
    })
    console.log("🗑️ Cache da IA limpo via API")
  } catch (error) {
    console.error("Erro ao limpar cache:", error)
  }
}

// Função para verificar status do cache (não implementada na API ainda)
export function getAICacheStatus() {
  return {
    size: 0,
    entries: [],
    note: "Cache gerenciado pela API route",
  }
}

// Fallback local simples
function generateFallbackAnalysis(data: DashboardData): AIAnalysis {
  const total = data.totalRecords
  const completed = (data.statusCounts["Concluído"] || 0) + (data.statusCounts["Concluido"] || 0)
  const completionRate = total > 0 ? (completed / total) * 100 : 0
  const noResponse = (data.statusCounts["Sem retorno"] || 0) + (data.statusCounts["Sem Retorno"] || 0)
  const noResponseRate = total > 0 ? (noResponse / total) * 100 : 0

  let riskLevel: "low" | "medium" | "high" = "medium"
  if (noResponseRate > 40) riskLevel = "high"
  else if (noResponseRate < 20 && completionRate > 60) riskLevel = "low"

  return {
    summary: `📊 Análise de Emergência: ${completed} de ${total} itens concluídos (${completionRate.toFixed(1)}%). ${
      noResponseRate > 40
        ? `🚨 CRÍTICO: ${noResponseRate.toFixed(1)}% sem retorno requer ação imediata.`
        : "Sistema funcionando com análise local."
    }`,
    insights: [
      {
        type: noResponseRate > 40 ? "danger" : "info",
        title: noResponseRate > 40 ? "Taxa Crítica de Sem Retorno" : "Análise Básica",
        message:
          noResponseRate > 40
            ? `${noResponseRate.toFixed(1)}% sem retorno indica problemas graves de comunicação`
            : "Sistema funcionando com análise local básica",
        recommendation:
          noResponseRate > 40
            ? "URGENTE: Implementar follow-up sistemático e revisar comunicação"
            : "Aguardar reconexão com sistema de IA",
        confidence: 80,
        priority: noResponseRate > 40 ? "high" : "low",
      },
    ],
    predictions: {
      completionTimeEstimate:
        total > completed ? `${Math.ceil((total - completed) / Math.max(1, completed / 7))} dias` : "Concluído",
      riskLevel,
      nextActions:
        noResponseRate > 40
          ? ["Implementar follow-up automático urgente", "Revisar todos os contatos", "Escalar para gestão superior"]
          : ["Continuar monitoramento", "Aguardar reconexão com IA"],
    },
    performance: {
      score: Math.round(Math.max(10, completionRate - noResponseRate)),
      trend: noResponseRate > 40 ? "declining" : "stable",
      benchmarkComparison: "Análise básica ativa",
    },
    timestamp: Date.now(),
    dataHash: `fallback-${Date.now()}`,
  }
}
