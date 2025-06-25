import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import type { DashboardData } from "../../../types"

// Cache para evitar requisições desnecessárias
const analysisCache = new Map<string, any>()
const statusHashCache = new Map<string, string>()
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutos

// Função para gerar hash específico dos STATUS
function generateStatusHash(statusCounts: Record<string, number>): string {
  const statusString = Object.entries(statusCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([status, count]) => `${status}:${count}`)
    .join("|")
  return btoa(statusString).slice(0, 12)
}

function generateDataHash(data: DashboardData): string {
  const key = `${data.totalRecords}-${JSON.stringify(data.statusCounts)}-${data.dashboardType}`
  return btoa(key).slice(0, 16)
}

export async function POST(request: NextRequest) {
  try {
    const {
      data,
      forceRefresh = false,
      isExecutive = false,
    }: {
      data: DashboardData
      forceRefresh?: boolean
      isExecutive?: boolean
    } = await request.json()

    const dataHash = generateDataHash(data)
    const statusHash = generateStatusHash(data.statusCounts)
    const now = Date.now()

    // Verificar se os STATUS mudaram
    const lastStatusHash = statusHashCache.get(data.tabId || "default")
    const statusChanged = lastStatusHash !== statusHash

    console.log(`📊 Análise ${isExecutive ? "EXECUTIVA" : "padrão"} para ${data.tabName}:`)
    console.log(`- Status mudaram: ${statusChanged}`)

    // Verificar cache primeiro
    const cached = analysisCache.get(dataHash + (isExecutive ? "-exec" : ""))
    if (!forceRefresh && cached && now - cached.timestamp < CACHE_DURATION && !statusChanged) {
      console.log("🎯 Usando análise executiva em cache")
      return NextResponse.json({ success: true, analysis: cached, fromCache: true })
    }

    // Se status não mudaram, usar análise local
    if (!forceRefresh && !statusChanged && cached) {
      console.log("📊 Status não mudaram - análise local executiva")
      const localAnalysis = generateExecutiveLocalAnalysis(data)
      analysisCache.set(dataHash + (isExecutive ? "-exec" : ""), localAnalysis)
      return NextResponse.json({ success: true, analysis: localAnalysis, fromLocal: true })
    }

    // Verificar API key
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.log("❌ OPENAI_API_KEY não configurada")
      const localAnalysis = generateExecutiveLocalAnalysis(data)
      return NextResponse.json({ success: true, analysis: localAnalysis, fromLocal: true })
    }

    console.log("🤖 Gerando insights EXECUTIVOS via IA")

    // Atualizar hash dos status
    statusHashCache.set(data.tabId || "default", statusHash)

    const isRollout = data.dashboardType === "rollout"
    const isTesting = data.dashboardType === "testing"

    // Calcular métricas executivas
    const metrics = calculateExecutiveMetrics(data)

    // Prompt executivo otimizado
    let executivePrompt = ""
    let systemPrompt = ""

    if (isRollout) {
      executivePrompt = `
      ANÁLISE EXECUTIVA - ROLLOUT DE MIGRAÇÃO
      
      📊 SITUAÇÃO:
      - ${metrics.total} lojas no rollout
      - ${metrics.completed} migradas (${metrics.completionRate.toFixed(1)}%)
      - ${metrics.noResponse} sem confirmação (${metrics.noResponseRate.toFixed(1)}%)
      - ${metrics.errors} com erro
      
      🎯 METAS EXECUTIVAS:
      - Meta: 100% lojas migradas
      - Prazo crítico: Sem retorno > 25%
      - Risco alto: < 60% conclusão
      
      FORNEÇA ANÁLISE EXECUTIVA EM 3 PONTOS:
      1. STATUS ATUAL (1 frase direta)
      2. RISCO PRINCIPAL (1 frase + impacto no cronograma)
      3. AÇÃO EXECUTIVA (1 decisão específica)
      `

      systemPrompt = "Consultor executivo especializado em rollouts. Respostas diretas para tomada de decisão."
    } else if (isTesting) {
      executivePrompt = `
      ANÁLISE EXECUTIVA - TESTES DE INTEGRAÇÃO
      
      📊 SITUAÇÃO:
      - ${metrics.total} testes de integração VS-PDV
      - ${metrics.completed} concluídos (${metrics.completionRate.toFixed(1)}%)
      - ${metrics.errors} falhas técnicas (${metrics.errorRate.toFixed(1)}%)
      - ${metrics.noResponse} sem retorno (${metrics.noResponseRate.toFixed(1)}%)
      
      🎯 METAS EXECUTIVAS:
      - Meta qualidade: < 5% erros técnicos
      - Meta comunicação: < 20% sem retorno
      - Criticidade: Erros > 10% = PARAR TESTES
      
      FORNEÇA ANÁLISE EXECUTIVA EM 3 PONTOS:
      1. QUALIDADE TÉCNICA (1 frase sobre erros)
      2. RISCO OPERACIONAL (1 frase + impacto)
      3. DECISÃO EXECUTIVA (1 ação específica)
      `

      systemPrompt = "Consultor executivo especializado em qualidade de software. Foco em decisões técnicas críticas."
    }

    const fullPrompt = `${executivePrompt}

    FORMATO OBRIGATÓRIO:
    - Máximo 3 frases
    - Linguagem executiva direta
    - Foco em DECISÃO, não descrição
    - Português do Brasil
    `

    // Configurar modelo OpenAI
    const model = openai("gpt-4o-mini", { apiKey })

    const { text } = await generateText({
      model,
      prompt: fullPrompt,
      system: systemPrompt,
      maxTokens: 200, // Reduzido para respostas mais concisas
    })

    // Gerar análise executiva estruturada
    const analysis = {
      summary: text,
      insights: generateExecutiveInsights(data, metrics, isRollout, isTesting),
      predictions: {
        completionTimeEstimate: estimateExecutiveCompletion(metrics, isRollout, isTesting),
        riskLevel: determineExecutiveRisk(metrics, isRollout),
        nextActions: generateExecutiveActions(metrics, isRollout, isTesting),
      },
      performance: {
        score: calculateExecutiveScore(metrics, isRollout),
        trend: determineExecutiveTrend(metrics, isRollout),
        benchmarkComparison: generateExecutiveBenchmark(metrics, isRollout, isTesting),
      },
      timestamp: now,
      dataHash,
    }

    // Salvar no cache
    analysisCache.set(dataHash + (isExecutive ? "-exec" : ""), analysis)
    cleanupCache()

    return NextResponse.json({ success: true, analysis, fromAI: true, statusChanged })
  } catch (error: any) {
    console.error("Erro ao gerar insights executivos:", error)
    const { data } = await request.json()
    const localAnalysis = generateExecutiveLocalAnalysis(data)
    return NextResponse.json({ success: true, analysis: localAnalysis, fromLocal: true, error: error.message })
  }
}

// Calcular métricas executivas precisas
function calculateExecutiveMetrics(data: DashboardData) {
  const total = data.totalRecords

  // Status padronizados
  const completed = (data.statusCounts["Concluído"] || 0) + (data.statusCounts["Concluido"] || 0)
  const pending = data.statusCounts["Pendente"] || 0
  const scheduled = data.statusCounts["Agendado"] || 0
  const errors = data.statusCounts["Erro"] || 0
  const noResponse = (data.statusCounts["Sem retorno"] || 0) + (data.statusCounts["Sem Retorno"] || 0)
  const inProgress = data.statusCounts["Em Andamento"] || 0

  const completionRate = total > 0 ? (completed / total) * 100 : 0
  const errorRate = total > 0 ? (errors / total) * 100 : 0
  const noResponseRate = total > 0 ? (noResponse / total) * 100 : 0
  const pendingRate = total > 0 ? (pending / total) * 100 : 0

  return {
    total,
    completed,
    pending,
    scheduled,
    errors,
    noResponse,
    inProgress,
    completionRate,
    errorRate,
    noResponseRate,
    pendingRate,
  }
}

// Análise local executiva
function generateExecutiveLocalAnalysis(data: DashboardData) {
  const isRollout = data.dashboardType === "rollout"
  const isTesting = data.dashboardType === "testing"
  const metrics = calculateExecutiveMetrics(data)

  let summary = ""

  if (isRollout) {
    if (metrics.noResponseRate > 25) {
      summary = `🚨 CRÍTICO: ${metrics.noResponseRate.toFixed(0)}% das lojas sem confirmação compromete cronograma. DECISÃO: Estabelecer prazo limite de 48h e escalar para regional. IMPACTO: Atraso no desligamento do sistema antigo.`
    } else if (metrics.completionRate > 80) {
      summary = `✅ ROLLOUT AVANÇADO: ${metrics.completionRate.toFixed(0)}% concluído, restam ${metrics.total - metrics.completed} lojas. DECISÃO: Acelerar últimas migrações e agendar desativação do sistema antigo. PRAZO: 2 semanas.`
    } else if (metrics.completionRate < 50) {
      summary = `⚠️ ROLLOUT LENTO: Apenas ${metrics.completionRate.toFixed(0)}% migrado. DECISÃO: Reforçar equipe de suporte e intensificar comunicação. RISCO: Não cumprimento do cronograma.`
    } else {
      summary = `📊 ROLLOUT EM ANDAMENTO: ${metrics.completionRate.toFixed(0)}% migrado, ritmo adequado. DECISÃO: Manter cronograma atual e focar em lojas com dificuldades. PRÓXIMO: Revisar em 1 semana.`
    }
  } else if (isTesting) {
    if (metrics.errorRate > 10) {
      summary = `🚨 QUALIDADE CRÍTICA: ${metrics.errorRate.toFixed(0)}% de falhas técnicas. DECISÃO: PAUSAR novos testes imediatamente e corrigir integração VS-PDV. IMPACTO: Risco de instabilidade em produção.`
    } else if (metrics.errorRate === 0 && metrics.completionRate > 70) {
      summary = `✅ QUALIDADE EXCELENTE: 0% erros técnicos, ${metrics.completionRate.toFixed(0)}% concluído. DECISÃO: Manter padrão atual e documentar melhores práticas. PRÓXIMO: Expandir testes.`
    } else if (metrics.noResponseRate > 40) {
      summary = `⚠️ COMUNICAÇÃO DEFICIENTE: ${metrics.noResponseRate.toFixed(0)}% sem retorno dos restaurantes. DECISÃO: Implementar follow-up automático e canal direto. RISCO: Atraso na validação.`
    } else {
      summary = `📊 TESTES ESTÁVEIS: ${metrics.completionRate.toFixed(0)}% concluído, ${metrics.errorRate.toFixed(0)}% erros. DECISÃO: Continuar ritmo atual e otimizar casos pendentes. QUALIDADE: Dentro do esperado.`
    }
  }

  return {
    summary,
    insights: generateExecutiveInsights(data, metrics, isRollout, isTesting),
    predictions: {
      completionTimeEstimate: estimateExecutiveCompletion(metrics, isRollout, isTesting),
      riskLevel: determineExecutiveRisk(metrics, isRollout),
      nextActions: generateExecutiveActions(metrics, isRollout, isTesting),
    },
    performance: {
      score: calculateExecutiveScore(metrics, isRollout),
      trend: determineExecutiveTrend(metrics, isRollout),
      benchmarkComparison: generateExecutiveBenchmark(metrics, isRollout, isTesting),
    },
    timestamp: Date.now(),
    dataHash: generateDataHash(data),
  }
}

function generateExecutiveInsights(data: DashboardData, metrics: any, isRollout: boolean, isTesting: boolean) {
  const insights = []

  if (isRollout) {
    // Insight crítico para rollout
    if (metrics.noResponseRate > 25) {
      insights.push({
        type: "danger",
        title: "Cronograma em Risco",
        message: `${metrics.noResponseRate.toFixed(0)}% das lojas sem confirmação`,
        recommendation: "Estabelecer prazo limite de 48h e escalar regionalmente",
        confidence: 95,
        priority: "high",
        metrics: { current: metrics.noResponseRate, target: 15, trend: "up" },
      })
    }

    if (metrics.completionRate > 80) {
      insights.push({
        type: "success",
        title: "Reta Final do Rollout",
        message: `${metrics.completed} de ${metrics.total} lojas migradas`,
        recommendation: "Agendar desativação do sistema antigo em 2 semanas",
        confidence: 90,
        priority: "medium",
        metrics: { current: metrics.completionRate, target: 100, trend: "up" },
      })
    }
  } else if (isTesting) {
    // Insight crítico para testes
    if (metrics.errorRate > 10) {
      insights.push({
        type: "danger",
        title: "Qualidade Crítica",
        message: `${metrics.errorRate.toFixed(0)}% de falhas técnicas na integração`,
        recommendation: "PAUSAR testes e corrigir problemas de integração VS-PDV",
        confidence: 98,
        priority: "high",
        metrics: { current: metrics.errorRate, target: 5, trend: "up" },
      })
    }

    if (metrics.errorRate === 0) {
      insights.push({
        type: "success",
        title: "Integração Estável",
        message: "Zero erros técnicos detectados",
        recommendation: "Manter padrão e expandir cobertura de testes",
        confidence: 90,
        priority: "low",
        metrics: { current: metrics.errorRate, target: 5, trend: "stable" },
      })
    }
  }

  return insights
}

function calculateExecutiveScore(metrics: any, isRollout: boolean): number {
  if (isRollout) {
    // Score executivo para rollout: foco em cronograma
    let score = metrics.completionRate * 0.6 // 60% conclusão
    score += Math.max(0, 100 - metrics.noResponseRate * 2) * 0.3 // 30% comunicação
    score += Math.max(0, 100 - metrics.errorRate * 5) * 0.1 // 10% erros
    return Math.round(Math.max(0, Math.min(100, score)))
  } else {
    // Score executivo para testes: foco em qualidade
    let score = metrics.completionRate * 0.4 // 40% conclusão
    score += Math.max(0, 100 - metrics.errorRate * 5) * 0.5 // 50% qualidade
    score += Math.max(0, 100 - metrics.noResponseRate * 1.5) * 0.1 // 10% comunicação
    return Math.round(Math.max(0, Math.min(100, score)))
  }
}

function determineExecutiveRisk(metrics: any, isRollout: boolean): "low" | "medium" | "high" {
  if (isRollout) {
    if (metrics.noResponseRate > 30 || metrics.completionRate < 40) return "high"
    if (metrics.noResponseRate > 20 || metrics.completionRate < 70) return "medium"
    return "low"
  } else {
    if (metrics.errorRate > 15 || metrics.noResponseRate > 50) return "high"
    if (metrics.errorRate > 8 || metrics.noResponseRate > 30) return "medium"
    return "low"
  }
}

function estimateExecutiveCompletion(metrics: any, isRollout: boolean, isTesting: boolean): string {
  if (isRollout) {
    const remaining = metrics.total - metrics.completed
    if (remaining <= 0) return "Concluído"

    const dailyRate = Math.max(3, Math.floor(metrics.completed / 14)) // 2 semanas
    const days = Math.ceil(remaining / dailyRate)

    if (days <= 7) return `${days} dias`
    if (days <= 30) return `${Math.ceil(days / 7)} semanas`
    return `${Math.ceil(days / 30)} meses`
  } else if (isTesting) {
    return "Processo contínuo"
  }
  return "Indeterminado"
}

function generateExecutiveActions(metrics: any, isRollout: boolean, isTesting: boolean): string[] {
  const actions = []

  if (isRollout) {
    if (metrics.noResponseRate > 25) {
      actions.push("Estabelecer prazo limite de 48h para confirmação")
      actions.push("Escalar casos críticos para gerência regional")
      actions.push("Implementar suporte presencial para lojas com dificuldades")
    } else if (metrics.completionRate > 80) {
      actions.push("Agendar desativação do sistema antigo")
      actions.push("Preparar comunicado oficial de encerramento")
      actions.push("Documentar lições aprendidas do rollout")
    } else {
      actions.push("Intensificar follow-up com lojas pendentes")
      actions.push("Revisar cronograma e recursos necessários")
    }
  } else if (isTesting) {
    if (metrics.errorRate > 10) {
      actions.push("PAUSAR novos testes imediatamente")
      actions.push("Convocar equipe técnica para correção urgente")
      actions.push("Revisar configurações de integração VS-PDV")
    } else if (metrics.noResponseRate > 40) {
      actions.push("Implementar follow-up automático diário")
      actions.push("Criar canal direto com restaurantes")
    } else {
      actions.push("Manter ritmo atual de testes")
      actions.push("Otimizar casos pendentes")
    }
  }

  return actions.slice(0, 4)
}

function determineExecutiveTrend(metrics: any, isRollout: boolean): "improving" | "declining" | "stable" {
  if (isRollout) {
    if (metrics.completionRate > 75 && metrics.noResponseRate < 20) return "improving"
    if (metrics.completionRate < 50 || metrics.noResponseRate > 35) return "declining"
  } else {
    if (metrics.completionRate > 70 && metrics.errorRate < 5) return "improving"
    if (metrics.errorRate > 15 || metrics.noResponseRate > 45) return "declining"
  }
  return "stable"
}

function generateExecutiveBenchmark(metrics: any, isRollout: boolean, isTesting: boolean): string {
  const score = calculateExecutiveScore(metrics, isRollout)
  const type = isRollout ? "rollouts corporativos" : "projetos de integração"

  if (score >= 85) return `Excelente - Top 10% dos ${type}`
  if (score >= 70) return `Bom - Acima da média dos ${type}`
  if (score >= 50) return `Adequado - Dentro da média`
  if (score >= 30) return `Abaixo da média - Requer ação`
  return `Crítico - Intervenção urgente necessária`
}

function cleanupCache() {
  const now = Date.now()
  for (const [key, analysis] of analysisCache.entries()) {
    if (now - analysis.timestamp > CACHE_DURATION * 2) {
      analysisCache.delete(key)
    }
  }
}

export async function DELETE() {
  analysisCache.clear()
  statusHashCache.clear()
  return NextResponse.json({ success: true, message: "Cache executivo limpo" })
}
