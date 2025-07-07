"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Users,
  Target,
  BarChart3,
  CalendarDays,
  Timer,
  Zap,
} from "lucide-react"
import type { DashboardData } from "../types"

interface FutureDashboardProps {
  data: DashboardData
  onBack: () => void
}

export function FutureDashboard({ data, onBack }: FutureDashboardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<"week" | "month" | "quarter">("month")

  const isRollout = data.dashboardType === "rollout"

  // Análise de previsões futuras
  const futureAnalysis = useMemo(() => {
    const today = new Date()
    const pendingItems = data.recentActivity.filter((item) => item.status === "Pendente" || item.status === "Agendado")

    const scheduledItems = data.recentActivity.filter((item) => item.status === "Agendado" && item.data_de_agendamento)

    // Calcular capacidade diária estimada
    const completedItems = data.recentActivity.filter(
      (item) => item.status === "Concluído" || item.status === "Concluido",
    )

    // Estimar capacidade baseada no histórico (assumindo 5 itens por dia útil)
    const dailyCapacity = isRollout ? 3 : 5 // Rollout é mais complexo
    const weeklyCapacity = dailyCapacity * 5 // 5 dias úteis
    const monthlyCapacity = weeklyCapacity * 4

    // Calcular dias necessários para conclusão
    const remainingItems = pendingItems.length
    const daysToComplete = Math.ceil(remainingItems / dailyCapacity)
    const estimatedCompletionDate = new Date(today)
    estimatedCompletionDate.setDate(today.getDate() + daysToComplete)

    // Análise de cronograma
    const nextWeekItems = scheduledItems.filter((item) => {
      if (!item.data_de_agendamento) return false
      const scheduleDate = new Date(item.data_de_agendamento)
      const nextWeek = new Date(today)
      nextWeek.setDate(today.getDate() + 7)
      return scheduleDate >= today && scheduleDate <= nextWeek
    })

    const nextMonthItems = scheduledItems.filter((item) => {
      if (!item.data_de_agendamento) return false
      const scheduleDate = new Date(item.data_de_agendamento)
      const nextMonth = new Date(today)
      nextMonth.setMonth(today.getMonth() + 1)
      return scheduleDate >= today && scheduleDate <= nextMonth
    })

    // Identificar gargalos e riscos
    const risks = []
    const opportunities = []

    if (remainingItems > monthlyCapacity) {
      risks.push({
        type: "capacity",
        message: `${remainingItems} itens pendentes excedem capacidade mensal de ${monthlyCapacity}`,
        severity: "high",
        impact: "Atraso de 2-3 meses no cronograma",
      })
    }

    if (nextWeekItems.length > weeklyCapacity) {
      risks.push({
        type: "overload",
        message: `${nextWeekItems.length} agendamentos na próxima semana excedem capacidade`,
        severity: "medium",
        impact: "Possível sobrecarga da equipe",
      })
    }

    if (scheduledItems.length < pendingItems.length * 0.3) {
      opportunities.push({
        type: "scheduling",
        message: "Muitos itens sem agendamento definido",
        action: "Acelerar processo de agendamento para melhor previsibilidade",
      })
    }

    // Distribuição por período
    const weeklyDistribution = []
    for (let i = 0; i < 12; i++) {
      // Próximas 12 semanas
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() + i * 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)

      const weekItems = scheduledItems.filter((item) => {
        if (!item.data_de_agendamento) return false
        const scheduleDate = new Date(item.data_de_agendamento)
        return scheduleDate >= weekStart && scheduleDate <= weekEnd
      })

      weeklyDistribution.push({
        week: i + 1,
        startDate: weekStart,
        endDate: weekEnd,
        scheduled: weekItems.length,
        capacity: weeklyCapacity,
        utilization: (weekItems.length / weeklyCapacity) * 100,
      })
    }

    return {
      pendingItems: remainingItems,
      scheduledItems: scheduledItems.length,
      completedItems: completedItems.length,
      dailyCapacity,
      weeklyCapacity,
      monthlyCapacity,
      daysToComplete,
      estimatedCompletionDate,
      nextWeekItems: nextWeekItems.length,
      nextMonthItems: nextMonthItems.length,
      risks,
      opportunities,
      weeklyDistribution,
      progressPercentage: (completedItems.length / data.totalRecords) * 100,
    }
  }, [data, isRollout])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const getUtilizationColor = (utilization: number) => {
    if (utilization > 100) return "bg-red-500"
    if (utilization > 80) return "bg-yellow-500"
    if (utilization > 60) return "bg-blue-500"
    return "bg-green-500"
  }

  const getRiskColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "border-red-500 bg-red-50"
      case "medium":
        return "border-yellow-500 bg-yellow-50"
      case "low":
        return "border-blue-500 bg-blue-50"
      default:
        return "border-gray-300 bg-gray-50"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={onBack} className="hover:bg-gray-100">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard de Previsões</h1>
                <p className="text-gray-600">{data.tabName} - Análise Futura</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={isRollout ? "default" : "secondary"}>{isRollout ? "Rollout" : "Testes"}</Badge>
              <Badge variant="outline">{futureAnalysis.progressPercentage.toFixed(1)}% Concluído</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Itens Pendentes</p>
                  <p className="text-3xl font-bold">{futureAnalysis.pendingItems}</p>
                  <p className="text-blue-100 text-xs mt-1">{futureAnalysis.daysToComplete} dias para conclusão</p>
                </div>
                <Clock className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Agendados</p>
                  <p className="text-3xl font-bold">{futureAnalysis.scheduledItems}</p>
                  <p className="text-green-100 text-xs mt-1">{futureAnalysis.nextWeekItems} na próxima semana</p>
                </div>
                <Calendar className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Capacidade Diária</p>
                  <p className="text-3xl font-bold">{futureAnalysis.dailyCapacity}</p>
                  <p className="text-purple-100 text-xs mt-1">{futureAnalysis.weeklyCapacity}/semana</p>
                </div>
                <Users className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Previsão de Conclusão</p>
                  <p className="text-lg font-bold">{formatDate(futureAnalysis.estimatedCompletionDate)}</p>
                  <p className="text-orange-100 text-xs mt-1">Em {futureAnalysis.daysToComplete} dias</p>
                </div>
                <Target className="w-8 h-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progresso Geral */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Progresso Geral do Projeto</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {futureAnalysis.completedItems} de {data.totalRecords} concluídos
                </span>
                <span className="text-sm text-gray-600">{futureAnalysis.progressPercentage.toFixed(1)}%</span>
              </div>
              <Progress value={futureAnalysis.progressPercentage} className="h-3" />
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">{futureAnalysis.completedItems}</div>
                  <div className="text-sm text-gray-600">Concluídos</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{futureAnalysis.scheduledItems}</div>
                  <div className="text-sm text-gray-600">Agendados</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{futureAnalysis.pendingItems}</div>
                  <div className="text-sm text-gray-600">Pendentes</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="timeline" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timeline">Cronograma</TabsTrigger>
            <TabsTrigger value="capacity">Capacidade</TabsTrigger>
            <TabsTrigger value="risks">Riscos & Oportunidades</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CalendarDays className="w-5 h-5" />
                  <span>Cronograma das Próximas 12 Semanas</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {futureAnalysis.weeklyDistribution.slice(0, 8).map((week) => (
                    <div key={week.week} className="flex items-center space-x-4">
                      <div className="w-20 text-sm font-medium">Semana {week.week}</div>
                      <div className="w-32 text-sm text-gray-600">{formatDate(week.startDate)}</div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                            <div
                              className={`h-4 rounded-full ${getUtilizationColor(week.utilization)}`}
                              style={{ width: `${Math.min(week.utilization, 100)}%` }}
                            />
                            {week.utilization > 100 && (
                              <div className="absolute right-0 top-0 h-4 w-2 bg-red-600 rounded-r-full" />
                            )}
                          </div>
                          <div className="w-16 text-sm text-right">
                            {week.scheduled}/{week.capacity}
                          </div>
                          <div className="w-12 text-sm text-right">{week.utilization.toFixed(0)}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="capacity" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5" />
                    <span>Análise de Capacidade</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Capacidade Diária</span>
                    <span className="font-bold">{futureAnalysis.dailyCapacity} itens</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Capacidade Semanal</span>
                    <span className="font-bold">{futureAnalysis.weeklyCapacity} itens</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Capacidade Mensal</span>
                    <span className="font-bold">{futureAnalysis.monthlyCapacity} itens</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span>Itens Restantes</span>
                      <span className="font-bold text-orange-600">{futureAnalysis.pendingItems}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Tempo Estimado</span>
                      <span className="font-bold text-blue-600">{futureAnalysis.daysToComplete} dias</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Timer className="w-5 h-5" />
                    <span>Próximos Marcos</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full" />
                      <div>
                        <div className="font-medium">Próxima Semana</div>
                        <div className="text-sm text-gray-600">{futureAnalysis.nextWeekItems} agendamentos</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                      <div>
                        <div className="font-medium">Próximo Mês</div>
                        <div className="text-sm text-gray-600">{futureAnalysis.nextMonthItems} agendamentos</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-purple-500 rounded-full" />
                      <div>
                        <div className="font-medium">Conclusão Estimada</div>
                        <div className="text-sm text-gray-600">
                          {formatDate(futureAnalysis.estimatedCompletionDate)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="risks" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Riscos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-red-600">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Riscos Identificados</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {futureAnalysis.risks.length > 0 ? (
                    futureAnalysis.risks.map((risk, index) => (
                      <div key={index} className={`p-4 rounded-lg border-l-4 ${getRiskColor(risk.severity)}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{risk.message}</div>
                            <div className="text-sm text-gray-600 mt-1">{risk.impact}</div>
                          </div>
                          <Badge variant={risk.severity === "high" ? "destructive" : "secondary"}>
                            {risk.severity === "high" ? "Alto" : "Médio"}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                      <p>Nenhum risco crítico identificado</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Oportunidades */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-green-600">
                    <Zap className="w-5 h-5" />
                    <span>Oportunidades de Melhoria</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {futureAnalysis.opportunities.length > 0 ? (
                    futureAnalysis.opportunities.map((opportunity, index) => (
                      <div key={index} className="p-4 rounded-lg border-l-4 border-green-500 bg-green-50">
                        <div className="font-medium text-gray-900">{opportunity.message}</div>
                        <div className="text-sm text-gray-600 mt-1">{opportunity.action}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                      <p>Processo otimizado</p>
                    </div>
                  )}

                  {/* Recomendações Gerais */}
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                    <div className="font-medium text-blue-900 mb-2">Recomendações</div>
                    <ul className="text-sm text-blue-800 space-y-1">
                      {isRollout ? (
                        <>
                          <li>• Agendar migrações em lotes de 3-5 lojas por semana</li>
                          <li>• Manter equipe de suporte disponível durante migrações</li>
                          <li>• Comunicar cronograma com 2 semanas de antecedência</li>
                        </>
                      ) : (
                        <>
                          <li>• Priorizar testes de integrações críticas</li>
                          <li>• Documentar problemas recorrentes</li>
                          <li>• Manter comunicação próxima com restaurantes</li>
                        </>
                      )}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
