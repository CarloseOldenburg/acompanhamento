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

// Função principal que chama a API route com contexto executivo
export async function generateAIInsights(
  data: DashboardData,
  forceRefresh = false,
  isExecutive = false,
): Promise<AIAnalysis> {
  try {
    console.log(`🤖 Chamando API route para insights ${isExecutive ? "EXECUTIVOS" : "padrão"}...`)

    const response = await fetch("/api/ai-insights", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data, forceRefresh, isExecutive }),
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
      console.log("🎯 Análise executiva obtida do cache")
    } else if (result.fromLocal) {
      console.log("📊 Análise executiva local gerada")
    } else if (result.fromAI) {
      console.log("🤖 Análise executiva da IA gerada com sucesso")
    }

    return result.analysis
  } catch (error) {
    console.error("Erro ao chamar API de insights executivos:", error)

    // Fallback local em caso de erro na API
    return generateExecutiveFallbackAnalysis(data, isExecutive)
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
        isExecutive: true,
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
    console.log("🗑️ Cache executivo da IA limpo via API")
  } catch (error) {
    console.error("Erro ao limpar cache executivo:", error)
  }
}

// Função para verificar status do cache
export function getAICacheStatus() {
  return {
    size: 0,
    entries: [],
    note: "Cache executivo gerenciado pela API route",
  }
}

// Fallback executivo local
function generateExecutiveFallbackAnalysis(data: DashboardData, isExecutive: boolean): AIAnalysis {
  const total = data.totalRecords
  const completed = (data.statusCounts["Concluído"] || 0) + (data.statusCounts["Concluido"] || 0)
  const errors = data.statusCounts["Erro"] || 0
  const noResponse = (data.statusCounts["Sem retorno"] || 0) + (data.statusCounts["Sem Retorno"] || 0)

  const completionRate = total > 0 ? (completed / total) * 100 : 0
  const errorRate = total > 0 ? (errors / total) * 100 : 0
  const noResponseRate = total > 0 ? (noResponse / total) * 100 : 0

  const isRollout = data.dashboardType === "rollout"

  let riskLevel: "low" | "medium" | "high" = "medium"
  let executiveSummary = ""

  if (isRollout) {
    if (noResponseRate > 25) {
      riskLevel = "high"
      executiveSummary = `🚨 CRÍTICO: ${noResponseRate.toFixed(0)}% das lojas sem confirmação compromete cronograma. DECISÃO: Estabelecer prazo limite de 48h e escalar regionalmente.`
    } else if (completionRate > 80) {
      riskLevel = "low"
      executiveSummary = `✅ ROLLOUT AVANÇADO: ${completionRate.toFixed(0)}% concluído. DECISÃO: Acelerar últimas migrações e agendar desativação do sistema antigo.`
    } else {
      executiveSummary = `📊 ROLLOUT EM ANDAMENTO: ${completionRate.toFixed(0)}% migrado. DECISÃO: Manter cronograma e focar em lojas com dificuldades.`
    }
  } else {
    if (errorRate > 10) {
      riskLevel = "high"
      executiveSummary = `🚨 QUALIDADE CRÍTICA: ${errorRate.toFixed(0)}% de falhas técnicas. DECISÃO: PAUSAR testes e corrigir integração VS-PDV imediatamente.`
    } else if (errorRate === 0 && completionRate > 70) {
      riskLevel = "low"
      executiveSummary = `✅ QUALIDADE EXCELENTE: 0% erros técnicos. DECISÃO: Manter padrão e expandir cobertura de testes.`
    } else {
      executiveSummary = `📊 TESTES ESTÁVEIS: ${completionRate.toFixed(0)}% concluído, ${errorRate.toFixed(0)}% erros. DECISÃO: Continuar ritmo atual.`
    }
  }

  return {
    summary: executiveSummary,
    insights: [
      {
        type: riskLevel === "high" ? "danger" : riskLevel === "medium" ? "warning" : "success",
        title: isRollout ? "Status do Rollout" : "Qualidade dos Testes",
        message: isRollout
          ? `${completionRate.toFixed(0)}% das lojas migradas, ${noResponseRate.toFixed(0)}% sem confirmação`
          : `${completionRate.toFixed(0)}% concluído, ${errorRate.toFixed(0)}% de falhas técnicas`,
        recommendation: isRollout
          ? noResponseRate > 25
            ? "Estabelecer prazo limite urgente"
            : "Manter cronograma atual"
          : errorRate > 10
            ? "Pausar testes e corrigir problemas"
            : "Continuar processo atual",
        confidence: 85,
        priority: riskLevel === "high" ? "high" : "medium",
      },
    ],
    predictions: {
      completionTimeEstimate: isRollout
        ? total > completed
          ? `${Math.ceil((total - completed) / Math.max(2, completed / 14))} dias`
          : "Concluído"
        : "Processo contínuo",
      riskLevel,
      nextActions: isRollout
        ? noResponseRate > 25
          ? ["Estabelecer prazo limite de 48h", "Escalar para gerência regional", "Suporte presencial"]
          : ["Manter cronograma", "Focar em lojas pendentes", "Preparar encerramento"]
        : errorRate > 10
          ? ["PAUSAR novos testes", "Corrigir problemas de integração", "Revisar configurações"]
          : ["Manter qualidade", "Otimizar casos pendentes", "Expandir cobertura"],
    },
    performance: {
      score: Math.round(
        isRollout
          ? completionRate * 0.6 + Math.max(0, 100 - noResponseRate * 2) * 0.4
          : completionRate * 0.4 + Math.max(0, 100 - errorRate * 5) * 0.6,
      ),
      trend: riskLevel === "high" ? "declining" : riskLevel === "low" ? "improving" : "stable",
      benchmarkComparison: "Análise executiva local ativa",
    },
    timestamp: Date.now(),
    dataHash: `exec-fallback-${Date.now()}`,
  }
}
