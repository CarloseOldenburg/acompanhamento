"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Lightbulb,
  Zap,
  RefreshCw,
  Sparkles,
  BarChart3,
  Activity,
  Database,
  Wifi,
  WifiOff,
  TestTube,
} from "lucide-react"
import { useState, useEffect } from "react"
import { clearAICache, testOpenAIConnection, type AIAnalysis } from "../lib/ai-insights"
import type { DashboardData } from "../types"
import { toast } from "sonner"

interface AIInsightsPanelProps {
  data: DashboardData
  isExecutive?: boolean
}

export function AIInsightsPanel({ data, isExecutive = false }: AIInsightsPanelProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isUsingCache, setIsUsingCache] = useState(false)
  const [isUsingLocal, setIsUsingLocal] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "connected" | "disconnected">("unknown")

  const testConnection = async () => {
    setLoading(true)
    try {
      const isConnected = await testOpenAIConnection()
      setConnectionStatus(isConnected ? "connected" : "disconnected")
      toast.success(isConnected ? "✅ Conexão com OpenAI funcionando!" : "❌ Problema na conexão com OpenAI", {
        description: isConnected ? "API key válida e funcionando" : "Usando análise local como fallback",
      })
    } catch (error) {
      setConnectionStatus("disconnected")
      toast.error("Erro ao testar conexão")
    } finally {
      setLoading(false)
    }
  }

  const generateInsights = async (forceRefresh = false) => {
    setLoading(true)
    setIsUsingCache(false)
    setIsUsingLocal(false)

    try {
      const startTime = Date.now()
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
      const endTime = Date.now()

      setAnalysis(result.analysis)
      setLastUpdate(new Date())

      // Detectar tipo de análise com mais precisão
      if (result.fromCache) {
        setIsUsingCache(true)
        toast.success("📊 Análise em cache", {
          description: "Status não mudaram - usando cache inteligente",
        })
      } else if (result.fromLocal) {
        setIsUsingLocal(true)
        toast.success("🔧 Análise local contextual", {
          description: result.statusChanged
            ? "Status mudaram - análise local otimizada gerada"
            : "Usando análise local inteligente",
        })
      } else if (result.fromAI) {
        setConnectionStatus("connected")
        toast.success("🤖 IA consultada", {
          description: result.statusChanged
            ? "Status mudaram - nova análise da IA gerada"
            : "Nova análise gerada pela OpenAI",
        })
      }
    } catch (error) {
      setConnectionStatus("disconnected")
      toast.error("Erro ao gerar insights da IA", {
        description: "Usando análise local como fallback",
      })
      console.error("AI Insights error:", error)
    } finally {
      setLoading(false)
    }
  }

  // Gerar insights automaticamente quando os dados mudarem (sem forçar)
  useEffect(() => {
    if (data.totalRecords > 0) {
      generateInsights(false) // Não força refresh, usa cache se disponível
    }
  }, [data.totalRecords, JSON.stringify(data.statusCounts)])

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case "danger":
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      default:
        return <Lightbulb className="w-4 h-4 text-blue-600" />
    }
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case "success":
        return "border-green-200 bg-green-50"
      case "warning":
        return "border-yellow-200 bg-yellow-50"
      case "danger":
        return "border-red-200 bg-red-50"
      default:
        return "border-blue-200 bg-blue-50"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-green-100 text-green-800"
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "high":
        return "text-red-600 bg-red-100"
      case "medium":
        return "text-yellow-600 bg-yellow-100"
      default:
        return "text-green-600 bg-green-100"
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case "declining":
        return <TrendingDown className="w-4 h-4 text-red-600" />
      default:
        return <Activity className="w-4 h-4 text-blue-600" />
    }
  }

  const getAnalysisTypeIcon = () => {
    if (isUsingCache) {
      return <Database className="w-4 h-4 text-blue-500" />
    } else if (isUsingLocal) {
      return <WifiOff className="w-4 h-4 text-orange-500" />
    } else {
      return <Wifi className="w-4 h-4 text-green-500" />
    }
  }

  const getAnalysisTypeText = () => {
    if (isUsingCache) {
      return "Cache"
    } else if (isUsingLocal) {
      return "Local"
    } else {
      return "IA Online"
    }
  }

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <Wifi className="w-4 h-4 text-green-500" />
      case "disconnected":
        return <WifiOff className="w-4 h-4 text-red-500" />
      default:
        return <TestTube className="w-4 h-4 text-gray-500" />
    }
  }

  if (!analysis && !loading) {
    return (
      <Card className="shadow-lg border-0">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-purple-600" />
              <CardTitle className="text-xl font-semibold text-slate-900">Insights da IA</CardTitle>
              <Sparkles className="w-4 h-4 text-purple-500" />
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={testConnection} variant="ghost" size="sm" title="Testar conexão OpenAI">
                {getConnectionIcon()}
              </Button>
              <Button onClick={() => generateInsights(true)} variant="outline" size="sm">
                <Zap className="w-4 h-4 mr-2" />
                Gerar Análise
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Clique em "Gerar Análise" para obter insights inteligentes</p>
            <p className="text-xs text-gray-500 mt-2">Sistema otimizado com cache inteligente e fallback local</p>
            {connectionStatus === "disconnected" && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">⚠️ OpenAI indisponível - usando análise local como alternativa</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-purple-50/30">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <CardTitle className="text-xl font-semibold text-slate-900">Análise Inteligente</CardTitle>
            <Sparkles className="w-4 h-4 text-purple-500" />
            {analysis && (
              <Badge variant="secondary" className="ml-2">
                Score: {analysis.performance.score}/100
              </Badge>
            )}
            <Badge variant="outline" className="ml-1 text-xs">
              {getAnalysisTypeIcon()}
              <span className="ml-1">{getAnalysisTypeText()}</span>
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            {lastUpdate && <span className="text-xs text-gray-500">{lastUpdate.toLocaleTimeString()}</span>}
            <Button onClick={testConnection} variant="ghost" size="sm" disabled={loading} title="Testar conexão OpenAI">
              {getConnectionIcon()}
            </Button>
            <Button
              onClick={() => generateInsights(true)}
              variant="outline"
              size="sm"
              disabled={loading}
              title="Forçar nova análise (ignora cache)"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Analisando..." : "Forçar Atualização"}
            </Button>
            <Button
              onClick={() => {
                clearAICache()
                toast.success("Cache limpo")
              }}
              variant="ghost"
              size="sm"
              title="Limpar cache da IA"
            >
              <Database className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-purple-600 animate-pulse" />
              <span className="text-sm text-gray-600">
                {isUsingCache ? "Carregando do cache..." : "IA analisando dados..."}
              </span>
            </div>
            <Progress value={33} className="w-full" />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ) : analysis ? (
          <Tabs defaultValue="insights" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="predictions">Previsões</TabsTrigger>
            </TabsList>

            <TabsContent value="insights" className="space-y-4">
              {/* Status da Conexão */}
              {connectionStatus === "disconnected" && (
                <Card className="border border-yellow-200 bg-yellow-50">
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-2">
                      <WifiOff className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm text-yellow-800">
                        OpenAI indisponível - usando análise local otimizada
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Performance Score */}
              <Card className="border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Target className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-slate-900">Score de Performance</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(analysis.performance.trend)}
                      <span className="text-2xl font-bold text-slate-900">{analysis.performance.score}</span>
                      <span className="text-sm text-gray-600">/100</span>
                    </div>
                  </div>
                  <Progress value={analysis.performance.score} className="mb-2" />
                  <p className="text-sm text-gray-600">{analysis.performance.benchmarkComparison}</p>
                </CardContent>
              </Card>

              {/* Insights List */}
              <div className="space-y-3">
                {analysis.insights.map((insight, index) => (
                  <Card key={index} className={`border ${getInsightColor(insight.type)}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        {getInsightIcon(insight.type)}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-slate-900">{insight.title}</h4>
                            <div className="flex items-center space-x-2">
                              <Badge className={getPriorityColor(insight.priority)} variant="secondary">
                                {insight.priority === "high"
                                  ? "Alta"
                                  : insight.priority === "medium"
                                    ? "Média"
                                    : "Baixa"}
                              </Badge>
                              <span className="text-xs text-gray-500">{insight.confidence}% confiança</span>
                            </div>
                          </div>
                          <p className="text-sm text-slate-700 mb-2">{insight.message}</p>
                          <p className="text-xs text-slate-600 bg-white/50 p-2 rounded">
                            💡 <strong>Recomendação:</strong> {insight.recommendation}
                          </p>
                          {insight.metrics && (
                            <div className="mt-2 flex items-center space-x-4 text-xs text-gray-600">
                              <span>Atual: {insight.metrics.current.toFixed(1)}%</span>
                              <span>Meta: {insight.metrics.target}%</span>
                              <span className="flex items-center space-x-1">
                                {insight.metrics.trend === "up" ? (
                                  <TrendingUp className="w-3 h-3 text-green-500" />
                                ) : insight.metrics.trend === "down" ? (
                                  <TrendingDown className="w-3 h-3 text-red-500" />
                                ) : (
                                  <Activity className="w-3 h-3 text-blue-500" />
                                )}
                                <span>
                                  {insight.metrics.trend === "up"
                                    ? "Subindo"
                                    : insight.metrics.trend === "down"
                                      ? "Descendo"
                                      : "Estável"}
                                </span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Performance Score Detalhado */}
                <Card className="border border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                      <span>Performance Geral</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Score Atual</span>
                        <span className="text-2xl font-bold text-blue-600">{analysis.performance.score}</span>
                      </div>
                      <Progress value={analysis.performance.score} className="h-3" />
                      <div className="flex items-center space-x-2">
                        {getTrendIcon(analysis.performance.trend)}
                        <span className="text-sm text-gray-600">
                          Tendência:{" "}
                          {analysis.performance.trend === "improving"
                            ? "Melhorando"
                            : analysis.performance.trend === "declining"
                              ? "Piorando"
                              : "Estável"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Benchmark */}
                <Card className="border border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Target className="w-5 h-5 text-green-600" />
                      <span>Benchmark</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700">{analysis.performance.benchmarkComparison}</p>
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Excelente (85+)</span>
                        <span>Bom (70+)</span>
                        <span>Médio (50+)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-red-400 via-yellow-400 via-green-400 to-green-600"
                          style={{ width: "100%" }}
                        />
                        <div
                          className="relative -mt-2 w-2 h-2 bg-blue-600 rounded-full border-2 border-white"
                          style={{ marginLeft: `${analysis.performance.score}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Resumo da IA */}
              <Card className="border border-purple-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <span>Análise Detalhada</span>
                    {isUsingLocal && (
                      <Badge variant="outline" className="text-xs">
                        <WifiOff className="w-3 h-3 mr-1" />
                        Análise Local
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 whitespace-pre-line">{analysis.summary}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="predictions" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Previsão de Conclusão */}
                <Card className="border border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span>Previsão de Conclusão</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {analysis.predictions.completionTimeEstimate}
                      </div>
                      <p className="text-sm text-gray-600">Estimativa baseada no ritmo atual</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Nível de Risco */}
                <Card className="border border-orange-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <span>Nível de Risco</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <Badge className={`text-lg px-4 py-2 ${getRiskColor(analysis.predictions.riskLevel)}`}>
                        {analysis.predictions.riskLevel === "high"
                          ? "Alto"
                          : analysis.predictions.riskLevel === "medium"
                            ? "Médio"
                            : "Baixo"}
                      </Badge>
                      <p className="text-sm text-gray-600 mt-2">Baseado em erros, pendências e progresso</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Próximas Ações */}
              <Card className="border border-green-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Lightbulb className="w-5 h-5 text-green-600" />
                    <span>Próximas Ações Recomendadas</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analysis.predictions.nextActions.map((action, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs font-bold text-green-700">
                          {index + 1}
                        </div>
                        <p className="text-sm text-gray-700 flex-1">{action}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : null}
      </CardContent>
    </Card>
  )
}
