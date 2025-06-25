import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import type { DashboardData } from "../../../types"

// Cache para evitar requisições desnecessárias
const analysisCache = new Map<string, any>()
const statusHashCache = new Map<string, string>()
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutos (aumentado)

// Função para gerar hash específico dos STATUS (não dos dados completos)
function generateStatusHash(statusCounts: Record<string, number>): string {
  const statusString = Object.entries(statusCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([status, count]) => `${status}:${count}`)
    .join("|")
  return btoa(statusString).slice(0, 12)
}

// Função para gerar hash dos dados completos
function generateDataHash(data: DashboardData): string {
  const key = `${data.totalRecords}-${JSON.stringify(data.statusCounts)}-${data.dashboardType}`
  return btoa(key).slice(0, 16)
}

export async function POST(request: NextRequest) {
  try {
    const { data, forceRefresh = false }: { data: DashboardData; forceRefresh?: boolean } = await request.json()

    const dataHash = generateDataHash(data)
    const statusHash = generateStatusHash(data.statusCounts)
    const now = Date.now()

    // Verificar se os STATUS mudaram (otimização principal)
    const lastStatusHash = statusHashCache.get(data.tabId || "default")
    const statusChanged = lastStatusHash !== statusHash

    console.log(`📊 Análise para ${data.tabName}:`)
    console.log(`- Status hash atual: ${statusHash}`)
    console.log(`- Status hash anterior: ${lastStatusHash}`)
    console.log(`- Status mudaram: ${statusChanged}`)

    // Verificar cache primeiro
    const cached = analysisCache.get(dataHash)
    if (!forceRefresh && cached && now - cached.timestamp < CACHE_DURATION && !statusChanged) {
      console.log("🎯 Usando análise em cache - status não mudaram")
      return NextResponse.json({ success: true, analysis: cached, fromCache: true })
    }

    // Se status não mudaram e temos análise recente, usar análise local otimizada
    if (!forceRefresh && !statusChanged && cached) {
      console.log("📊 Status não mudaram - usando análise local otimizada")
      const localAnalysis = generateContextualLocalAnalysis(data)
      analysisCache.set(dataHash, localAnalysis)
      return NextResponse.json({ success: true, analysis: localAnalysis, fromLocal: true })
    }

    // Verificar se a API key está disponível
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.log("❌ OPENAI_API_KEY não configurada, usando análise local")
      const localAnalysis = generateContextualLocalAnalysis(data)
      return NextResponse.json({ success: true, analysis: localAnalysis, fromLocal: true })
    }

    console.log("🤖 STATUS MUDARAM - Fazendo requisição à IA com contexto específico")

    // Atualizar hash dos status
    statusHashCache.set(data.tabId || "default", statusHash)

    const isRollout = data.dashboardType === "rollout"
    const isTesting = data.dashboardType === "testing"

    // Calcular métricas básicas
    const total = data.totalRecords
    const completed =
      (data.statusCounts["Concluído"] || 0) +
      (data.statusCounts["Concluido"] || 0) +
      (data.statusCounts["Aprovado"] || 0)
    const pending = (data.statusCounts["Pendente"] || 0) + (data.statusCounts["Aguardando"] || 0)
    const errors = data.statusCounts["Erro"] || 0
    const noResponse = (data.statusCounts["Sem retorno"] || 0) + (data.statusCounts["Sem Retorno"] || 0)
    const inProgress = (data.statusCounts["Agendado"] || 0) + (data.statusCounts["Em Andamento"] || 0)

    const completionRate = total > 0 ? (completed / total) * 100 : 0
    const errorRate = total > 0 ? (errors / total) * 100 : 0
    const noResponseRate = total > 0 ? (noResponse / total) * 100 : 0

    // Prompt contextualizado baseado no tipo de processo
    let contextualPrompt = ""
    let systemPrompt = ""

    if (isRollout) {
      contextualPrompt = `
      CONTEXTO: ROLLOUT DE MIGRAÇÃO DE SISTEMA
      Este é um processo de migração de ${total} lojas do sistema antigo para o novo sistema.
      
      📊 SITUAÇÃO ATUAL:
      - Total de lojas: ${total}
      - Migradas (Concluído): ${completed} (${completionRate.toFixed(1)}%)
      - Agendadas: ${inProgress}
      - Pendentes: ${pending}
      - Sem retorno: ${noResponse} (${noResponseRate.toFixed(1)}%)
      - Erros: ${errors}

      CARACTERÍSTICAS DO ROLLOUT:
      - Processo de migração única por loja
      - Cada loja só muda de status uma vez
      - "Sem retorno" indica falta de comunicação/confirmação
      - Meta: 100% das lojas migradas
      - Criticidade: Sem retorno > 30% é crítico para cronograma

      Analise como especialista em rollout de sistemas:
      `

      systemPrompt = "Especialista em rollout e migração de sistemas com foco em cronograma e comunicação."
    } else if (isTesting) {
      contextualPrompt = `
      CONTEXTO: TESTES DE INTEGRAÇÃO CONTÍNUOS
      Este é um processo contínuo de validação de integração entre sistema VS e PDVs de restaurantes.
      
      📊 SITUAÇÃO ATUAL:
      - Total de testes: ${total}
      - Concluídos: ${completed} (${completionRate.toFixed(1)}%)
      - Agendados: ${inProgress}
      - Pendentes: ${pending}
      - Sem retorno: ${noResponse} (${noResponseRate.toFixed(1)}%)
      - Erros: ${errors} (${errorRate.toFixed(1)}%)

      CARACTERÍSTICAS DOS TESTES:
      - Processo contínuo (novos testes sempre chegando)
      - Validação de integração VS ↔ PDV
      - "Sem retorno" indica problemas de comunicação com restaurantes
      - "Erro" indica falha técnica na integração
      - Meta: < 5% erros, < 15% sem retorno
      - Criticidade: Erros técnicos são mais críticos que sem retorno

      Analise como especialista em testes de integração:
      `

      systemPrompt = "Especialista em testes de integração e validação de sistemas com foco em qualidade técnica."
    }

    const fullPrompt = `${contextualPrompt}

    Forneça análise CONCISA e CONTEXTUAL em português:
    1. Situação atual do processo (2 frases)
    2. Principal risco/oportunidade específico (1 frase)
    3. Ação prioritária contextual (1 frase)
    4. Previsão realista de conclusão
    5. Score 0-100 baseado no contexto

    Seja direto, prático e específico para o tipo de processo.
    `

    // Configurar o modelo OpenAI
    const model = openai("gpt-4o-mini", {
      apiKey: apiKey,
    })

    const { text } = await generateText({
      model: model,
      prompt: fullPrompt,
      system: systemPrompt,
      maxTokens: 400,
    })

    // Processar resposta da IA e gerar insights estruturados
    const insights = generateContextualInsights(data, completionRate, errorRate, noResponseRate, isRollout, isTesting)
    const performanceScore = calculateContextualScore(
      completionRate,
      errorRate,
      noResponseRate,
      inProgress,
      total,
      isRollout,
    )
    const trend = determineContextualTrend(completionRate, errorRate, noResponseRate, isRollout)
    const completionEstimate = estimateContextualCompletion(completed, total, inProgress, isRollout, isTesting)
    const riskLevel = determineContextualRisk(errorRate, noResponseRate, completionRate, isRollout)

    const analysis = {
      summary: text,
      insights,
      predictions: {
        completionTimeEstimate: completionEstimate,
        riskLevel,
        nextActions: generateContextualActions(data, isRollout, isTesting, errorRate, noResponseRate, completionRate),
      },
      performance: {
        score: performanceScore,
        trend,
        benchmarkComparison: generateContextualBenchmark(performanceScore, isRollout, isTesting),
      },
      timestamp: now,
      dataHash,
    }

    // Salvar no cache
    analysisCache.set(dataHash, analysis)

    // Limpar cache antigo
    cleanupCache()

    return NextResponse.json({ success: true, analysis, fromAI: true, statusChanged })
  } catch (error: any) {
    console.error("Erro ao gerar insights da IA:", error)

    // Fallback com análise local
    const { data } = await request.json()
    const localAnalysis = generateContextualLocalAnalysis(data) || generateFallbackAnalysis(data)

    return NextResponse.json({ success: true, analysis: localAnalysis, fromLocal: true, error: error.message })
  }
}

// Análise local contextualizada
function generateContextualLocalAnalysis(data: DashboardData) {
  try {
    const isRollout = data.dashboardType === "rollout"
    const isTesting = data.dashboardType === "testing"
    const total = data.totalRecords

    if (total === 0) return null

    const completed = (data.statusCounts["Concluído"] || 0) + (data.statusCounts["Concluido"] || 0)
    const errors = data.statusCounts["Erro"] || 0
    const noResponse = (data.statusCounts["Sem retorno"] || 0) + (data.statusCounts["Sem Retorno"] || 0)
    const inProgress = (data.statusCounts["Agendado"] || 0) + (data.statusCounts["Em Andamento"] || 0)

    const completionRate = (completed / total) * 100
    const errorRate = (errors / total) * 100
    const noResponseRate = (noResponse / total) * 100

    let summary = ""

    if (isRollout) {
      summary = `🏢 Análise de Rollout: ${completed} de ${total} lojas migradas (${completionRate.toFixed(1)}%). `

      if (noResponseRate > 30) {
        summary += `🚨 CRÍTICO: ${noResponseRate.toFixed(1)}% das lojas sem confirmação compromete cronograma de migração. `
        summary += `Ação urgente: Contatar lojas pendentes e estabelecer prazo limite para migração.`
      } else if (completionRate > 80) {
        summary += `✅ Migração avançada! Foco nas ${total - completed} lojas restantes. `
        summary += `Recomendação: Acelerar últimas migrações e preparar encerramento do sistema antigo.`
      } else if (completionRate < 50) {
        summary += `📈 Migração lenta (${completionRate.toFixed(1)}%). `
        summary += `Recomendação: Intensificar comunicação e suporte às lojas para acelerar processo.`
      } else {
        summary += `📊 Migração em ritmo moderado. `
        summary += `Recomendação: Manter cronograma e focar em lojas com dificuldades.`
      }
    } else if (isTesting) {
      summary = `🔧 Análise de Testes: ${completed} de ${total} testes concluídos (${completionRate.toFixed(1)}%). `

      if (errorRate > 10) {
        summary += `🚨 CRÍTICO: ${errorRate.toFixed(1)}% de falhas técnicas indica problemas graves de integração. `
        summary += `Ação urgente: Pausar novos testes e corrigir problemas de integração VS-PDV.`
      } else if (noResponseRate > 40) {
        summary += `⚠️ ALTO: ${noResponseRate.toFixed(1)}% sem retorno de restaurantes. `
        summary += `Recomendação: Melhorar comunicação e follow-up com estabelecimentos.`
      } else if (errorRate === 0 && completionRate > 70) {
        summary += `✅ Excelente qualidade! Sem erros técnicos e boa taxa de conclusão. `
        summary += `Recomendação: Manter padrão de qualidade e documentar melhores práticas.`
      } else {
        summary += `📊 Processo de testes estável. `
        summary += `Recomendação: Continuar monitoramento e otimizar casos pendentes.`
      }
    }

    if (errorRate > 0 && isTesting) {
      summary += ` ⚠️ ${errors} erro(s) técnico(s) requer investigação imediata.`
    }

    if (inProgress > 0) {
      summary += ` 🔄 ${inProgress} ${isRollout ? "migração(ões)" : "teste(s)"} em andamento.`
    }

    const insights = generateContextualInsights(data, completionRate, errorRate, noResponseRate, isRollout, isTesting)
    const performanceScore = calculateContextualScore(
      completionRate,
      errorRate,
      noResponseRate,
      inProgress,
      total,
      isRollout,
    )
    const trend = determineContextualTrend(completionRate, errorRate, noResponseRate, isRollout)
    const completionEstimate = estimateContextualCompletion(completed, total, inProgress, isRollout, isTesting)
    const riskLevel = determineContextualRisk(errorRate, noResponseRate, completionRate, isRollout)

    return {
      summary,
      insights,
      predictions: {
        completionTimeEstimate: completionEstimate,
        riskLevel,
        nextActions: generateContextualActions(data, isRollout, isTesting, errorRate, noResponseRate, completionRate),
      },
      performance: {
        score: performanceScore,
        trend,
        benchmarkComparison: generateContextualBenchmark(performanceScore, isRollout, isTesting),
      },
      timestamp: Date.now(),
      dataHash: generateDataHash(data),
    }
  } catch (error) {
    console.error("Erro na análise local contextual:", error)
    return null
  }
}

function generateContextualInsights(
  data: DashboardData,
  completionRate: number,
  errorRate: number,
  noResponseRate: number,
  isRollout: boolean,
  isTesting: boolean,
) {
  const insights = []

  if (isRollout) {
    // Insights específicos para ROLLOUT
    if (noResponseRate > 30) {
      insights.push({
        type: "danger",
        title: "Cronograma de Migração em Risco",
        message: `${noResponseRate.toFixed(1)}% das lojas sem confirmação compromete o cronograma de rollout`,
        recommendation: "Estabelecer prazo limite e contatar lojas pendentes urgentemente",
        confidence: 95,
        priority: "high",
        metrics: { current: noResponseRate, target: 15, trend: "up" },
      })
    }

    if (completionRate >= 80) {
      insights.push({
        type: "success",
        title: "Migração Quase Completa",
        message: `${completionRate.toFixed(1)}% das lojas já migradas - reta final do rollout`,
        recommendation: "Focar nas lojas restantes e preparar desativação do sistema antigo",
        confidence: 90,
        priority: "medium",
        metrics: { current: completionRate, target: 100, trend: "up" },
      })
    } else if (completionRate < 50) {
      insights.push({
        type: "warning",
        title: "Migração Lenta",
        message: `Apenas ${completionRate.toFixed(1)}% das lojas migradas - ritmo abaixo do esperado`,
        recommendation: "Intensificar suporte e comunicação para acelerar migração",
        confidence: 85,
        priority: "high",
        metrics: { current: completionRate, target: 80, trend: "stable" },
      })
    }
  } else if (isTesting) {
    // Insights específicos para TESTES DE INTEGRAÇÃO
    if (errorRate > 10) {
      insights.push({
        type: "danger",
        title: "Falhas Críticas de Integração",
        message: `${errorRate.toFixed(1)}% de erros técnicos indica problemas graves na integração VS-PDV`,
        recommendation: "URGENTE: Pausar novos testes e corrigir problemas de integração",
        confidence: 98,
        priority: "high",
        metrics: { current: errorRate, target: 5, trend: "up" },
      })
    } else if (errorRate === 0) {
      insights.push({
        type: "success",
        title: "Integração Estável",
        message: "Nenhum erro técnico detectado - integração VS-PDV funcionando perfeitamente",
        recommendation: "Manter padrão de qualidade e documentar configurações bem-sucedidas",
        confidence: 90,
        priority: "low",
        metrics: { current: errorRate, target: 5, trend: "stable" },
      })
    }

    if (noResponseRate > 40) {
      insights.push({
        type: "warning",
        title: "Comunicação com Restaurantes",
        message: `${noResponseRate.toFixed(1)}% sem retorno indica problemas de comunicação com estabelecimentos`,
        recommendation: "Melhorar follow-up e canais de comunicação com restaurantes",
        confidence: 85,
        priority: "medium",
        metrics: { current: noResponseRate, target: 15, trend: "up" },
      })
    }

    if (completionRate > 70 && errorRate < 5) {
      insights.push({
        type: "success",
        title: "Processo de Testes Eficiente",
        message: `${completionRate.toFixed(1)}% de conclusão com baixa taxa de erros`,
        recommendation: "Processo funcionando bem - manter ritmo e padrão de qualidade",
        confidence: 88,
        priority: "low",
        metrics: { current: completionRate, target: 80, trend: "up" },
      })
    }
  }

  return insights
}

function calculateContextualScore(
  completionRate: number,
  errorRate: number,
  noResponseRate: number,
  inProgress: number,
  total: number,
  isRollout: boolean,
): number {
  let score = 0

  if (isRollout) {
    // Para rollout: foco em conclusão e comunicação
    score += (completionRate / 100) * 50 // 50% do score
    score += Math.max(0, (100 - noResponseRate * 1.5) / 100) * 30 // 30% do score
    score += Math.max(0, (100 - errorRate * 3) / 100) * 20 // 20% do score
  } else {
    // Para testes: foco em qualidade técnica
    score += (completionRate / 100) * 35 // 35% do score
    score += Math.max(0, (100 - errorRate * 4) / 100) * 40 // 40% do score (mais peso)
    score += Math.max(0, (100 - noResponseRate * 1.2) / 100) * 25 // 25% do score
  }

  return Math.round(Math.max(0, Math.min(100, score)))
}

function determineContextualTrend(
  completionRate: number,
  errorRate: number,
  noResponseRate: number,
  isRollout: boolean,
) {
  if (isRollout) {
    if (completionRate > 80 && noResponseRate < 20) return "improving"
    if (completionRate < 40 || noResponseRate > 40) return "declining"
  } else {
    if (completionRate > 70 && errorRate < 5 && noResponseRate < 20) return "improving"
    if (errorRate > 15 || noResponseRate > 50) return "declining"
  }
  return "stable"
}

function estimateContextualCompletion(
  completed: number,
  total: number,
  inProgress: number,
  isRollout: boolean,
  isTesting: boolean,
): string {
  if (total === 0) return "Não é possível estimar"

  const remaining = total - completed

  if (remaining <= 0) return "Concluído"

  if (isRollout) {
    // Rollout tem prazo definido
    const dailyRate = Math.max(2, Math.floor(completed / 10)) // Assumindo 10 dias de trabalho
    const daysRemaining = Math.ceil(remaining / dailyRate)

    if (daysRemaining <= 5) return `${daysRemaining} dias`
    if (daysRemaining <= 21) return `${Math.ceil(daysRemaining / 7)} semanas`
    return `${Math.ceil(daysRemaining / 30)} meses`
  } else if (isTesting) {
    // Testes são contínuos
    return "Processo contínuo - novos testes sempre chegando"
  }

  return "Estimativa não disponível"
}

function determineContextualRisk(
  errorRate: number,
  noResponseRate: number,
  completionRate: number,
  isRollout: boolean,
): "low" | "medium" | "high" {
  if (isRollout) {
    if (noResponseRate > 40 || completionRate < 30) return "high"
    if (noResponseRate > 20 || completionRate < 60) return "medium"
    return "low"
  } else {
    if (errorRate > 15 || noResponseRate > 50) return "high"
    if (errorRate > 8 || noResponseRate > 30) return "medium"
    return "low"
  }
}

function generateContextualActions(
  data: DashboardData,
  isRollout: boolean,
  isTesting: boolean,
  errorRate: number,
  noResponseRate: number,
  completionRate: number,
): string[] {
  const actions: string[] = []

  if (isRollout) {
    if (noResponseRate > 30) {
      actions.push("URGENTE: Contatar todas as lojas sem confirmação")
      actions.push("Estabelecer prazo limite para migração")
      actions.push("Preparar suporte intensivo para lojas com dificuldades")
    }

    if (completionRate > 80) {
      actions.push("Focar nas últimas lojas pendentes")
      actions.push("Preparar cronograma de desativação do sistema antigo")
      actions.push("Documentar lições aprendidas do rollout")
    } else if (completionRate < 50) {
      actions.push("Intensificar comunicação com lojas pendentes")
      actions.push("Aumentar equipe de suporte para migração")
      actions.push("Revisar processo de migração para otimizar")
    }

    actions.push("Monitorar lojas migradas para garantir estabilidade")
  } else if (isTesting) {
    if (errorRate > 10) {
      actions.push("CRÍTICO: Pausar novos testes até corrigir erros")
      actions.push("Investigar problemas de integração VS-PDV")
      actions.push("Revisar configurações de conectividade")
    }

    if (noResponseRate > 40) {
      actions.push("Implementar follow-up automático com restaurantes")
      actions.push("Melhorar canais de comunicação (WhatsApp, telefone)")
      actions.push("Criar guia de teste para restaurantes")
    }

    if (errorRate < 5 && completionRate > 70) {
      actions.push("Manter padrão de qualidade atual")
      actions.push("Documentar configurações bem-sucedidas")
      actions.push("Otimizar processo para novos testes")
    }

    actions.push("Continuar monitoramento contínuo de qualidade")
  }

  return actions.slice(0, 6)
}

function generateContextualBenchmark(score: number, isRollout: boolean, isTesting: boolean): string {
  const processType = isRollout ? "rollouts de migração" : "projetos de testes de integração"

  if (score >= 85) {
    return `Excelente! Performance no top 10% dos ${processType}`
  } else if (score >= 70) {
    return `Bom desempenho, acima da média dos ${processType}`
  } else if (score >= 50) {
    return `Performance mediana comparado a ${processType} similares`
  } else if (score >= 30) {
    return `Abaixo da média, requer melhorias urgentes`
  } else {
    return `Performance crítica, necessita intervenção imediata`
  }
}

function generateFallbackAnalysis(data: DashboardData) {
  const total = data.totalRecords
  const completed = (data.statusCounts["Concluído"] || 0) + (data.statusCounts["Concluido"] || 0)
  const completionRate = total > 0 ? (completed / total) * 100 : 0
  const isRollout = data.dashboardType === "rollout"

  return {
    summary: `📊 Análise de Emergência: ${completed} de ${total} ${isRollout ? "lojas migradas" : "testes concluídos"} (${completionRate.toFixed(1)}%). Sistema funcionando com análise local.`,
    insights: [
      {
        type: "info",
        title: "Análise Básica Ativa",
        message: "Sistema funcionando com análise local contextual",
        recommendation: "Aguardar reconexão com sistema de IA",
        confidence: 80,
        priority: "low",
      },
    ],
    predictions: {
      completionTimeEstimate: isRollout ? "Estimativa indisponível" : "Processo contínuo",
      riskLevel: "medium" as const,
      nextActions: ["Continuar monitoramento", "Aguardar reconexão com IA"],
    },
    performance: {
      score: Math.round(completionRate),
      trend: "stable" as const,
      benchmarkComparison: "Análise básica ativa",
    },
    timestamp: Date.now(),
    dataHash: `fallback-${Date.now()}`,
  }
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
  return NextResponse.json({ success: true, message: "Cache limpo" })
}
