"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts"
import {
  ArrowLeft,
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Users,
  Activity,
  Eye,
  EyeOff,
  BarChart3,
  PieChartIcon,
  XCircle,
  Calendar,
  Zap,
  Shield,
  AlertCircle,
} from "lucide-react"
import type { DashboardData } from "../types"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { AIInsightsPanel } from "./ai-insights-panel"

interface ExecutiveDashboardProps {
  data: DashboardData
  onBack: () => void
}

const COLORS = {
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
  neutral: "#6b7280",
  purple: "#8b5cf6",
}

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

export function ExecutiveDashboard({ data, onBack }: ExecutiveDashboardProps) {
  const [viewMode, setViewMode] = useState<"macro" | "micro">("macro")
  const [selectedChart, setSelectedChart] = useState<"bar" | "line" | "pie">("bar")

  // Determinar tipo de dashboard
  const dashboardType = data.dashboardType || "rollout"
  const isRollout = dashboardType === "rollout"
  const isTesting = dashboardType === "testing"

  // Métricas Executivas Precisas
  const executiveMetrics = useMemo(() => {
    const total = data.totalRecords
    const statusEntries = Object.entries(data.statusCounts)

    console.log("=== MÉTRICAS EXECUTIVAS ===")
    console.log("Tipo:", isRollout ? "ROLLOUT" : "TESTES")
    console.log("Status counts:", data.statusCounts)

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
    const scheduledRate = total > 0 ? (scheduled / total) * 100 : 0

    // Score executivo específico
    let executiveScore = 0
    if (isRollout) {
      // Rollout: foco em cronograma e comunicação
      executiveScore =
        completionRate * 0.6 + Math.max(0, 100 - noResponseRate * 2) * 0.3 + Math.max(0, 100 - errorRate * 5) * 0.1
    } else {
      // Testes: foco em qualidade técnica
      executiveScore =
        completionRate * 0.4 + Math.max(0, 100 - errorRate * 5) * 0.5 + Math.max(0, 100 - noResponseRate * 1.5) * 0.1
    }

    // Determinar status executivo
    let executiveStatus = "Em Andamento"
    let statusColor = COLORS.info
    let statusIcon = Activity

    if (isRollout) {
      if (noResponseRate > 25) {
        executiveStatus = "Cronograma em Risco"
        statusColor = COLORS.danger
        statusIcon = AlertTriangle
      } else if (completionRate > 80) {
        executiveStatus = "Reta Final"
        statusColor = COLORS.success
        statusIcon = CheckCircle
      } else if (completionRate < 50) {
        executiveStatus = "Ritmo Lento"
        statusColor = COLORS.warning
        statusIcon = Clock
      }
    } else {
      if (errorRate > 10) {
        executiveStatus = "Qualidade Crítica"
        statusColor = COLORS.danger
        statusIcon = AlertTriangle
      } else if (errorRate === 0 && completionRate > 70) {
        executiveStatus = "Qualidade Excelente"
        statusColor = COLORS.success
        statusIcon = Shield
      } else if (noResponseRate > 40) {
        executiveStatus = "Comunicação Deficiente"
        statusColor = COLORS.warning
        statusIcon = AlertCircle
      }
    }

    // Simular cronograma para rollout (últimos 14 dias)
    const timelineData = Array.from({ length: 14 }, (_, i) => {
      const day = new Date()
      day.setDate(day.getDate() - (13 - i))
      const dayProgress = (i + 1) / 14

      const dayCompleted = Math.floor(completed * dayProgress * (0.8 + Math.random() * 0.4))
      const dayScheduled = Math.floor(scheduled * (1 - dayProgress * 0.7))
      const dayPending = Math.floor(pending * (1 - dayProgress * 0.5))
      const dayErrors = Math.floor(errors * dayProgress * 0.6)

      return {
        date: day.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        completed: Math.max(0, dayCompleted),
        scheduled: Math.max(0, dayScheduled),
        pending: Math.max(0, dayPending),
        errors: Math.max(0, dayErrors),
        noResponse: Math.max(0, Math.floor(noResponse * (1 - dayProgress * 0.3))),
        total: total,
        completionRate: Math.min(100, (dayCompleted / total) * 100),
      }
    })

    console.log("Métricas calculadas:")
    console.log("- Score executivo:", Math.round(executiveScore))
    console.log("- Status:", executiveStatus)
    console.log("- Conclusão:", completionRate.toFixed(1) + "%")
    console.log("- Erros:", errorRate.toFixed(1) + "%")
    console.log("- Sem retorno:", noResponseRate.toFixed(1) + "%")

    return {
      // KPIs Principais
      totalItems: {
        value: total,
        label: isRollout ? "Total de Lojas" : "Total de Testes",
        sublabel: isRollout ? "no rollout" : "de integração",
        icon: isRollout ? Users : Activity,
        color: COLORS.info,
      },
      executiveScore: {
        value: Math.round(executiveScore),
        label: "Score Executivo",
        sublabel: isRollout ? "cronograma + comunicação" : "qualidade + conclusão",
        icon: Target,
        color: executiveScore >= 80 ? COLORS.success : executiveScore >= 60 ? COLORS.warning : COLORS.danger,
      },
      completionRate: {
        value: completionRate,
        label: "Taxa de Conclusão",
        sublabel: `${completed} de ${total} ${isRollout ? "migradas" : "concluídos"}`,
        icon: CheckCircle,
        color: completionRate >= 80 ? COLORS.success : completionRate >= 60 ? COLORS.warning : COLORS.danger,
      },
      criticalMetric: {
        value: isRollout ? noResponseRate : errorRate,
        label: isRollout ? "Sem Confirmação" : "Falhas Técnicas",
        sublabel: isRollout ? "compromete cronograma" : "afeta qualidade",
        icon: isRollout ? XCircle : AlertTriangle,
        color: isRollout
          ? noResponseRate > 25
            ? COLORS.danger
            : noResponseRate > 15
              ? COLORS.warning
              : COLORS.success
          : errorRate > 10
            ? COLORS.danger
            : errorRate > 5
              ? COLORS.warning
              : COLORS.success,
      },

      // Status detalhados
      statusBreakdown: {
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
        scheduledRate,
      },

      // Status executivo
      executiveStatus,
      statusColor,
      statusIcon,

      // Timeline para rollout
      timelineData,
    }
  }, [data, isRollout, isTesting])

  // Dados para gráficos executivos
  const chartData = useMemo(() => {
    const statusData = Object.entries(data.statusCounts)
      .map(([status, count], index) => {
        let statusColor = CHART_COLORS[index % CHART_COLORS.length]
        let priority = 0

        // Cores específicas por status
        switch (status.toLowerCase()) {
          case "concluído":
          case "concluido":
            statusColor = "#10b981"
            priority = 5
            break
          case "pendente":
            statusColor = "#f59e0b"
            priority = 3
            break
          case "agendado":
            statusColor = "#3b82f6"
            priority = 4
            break
          case "erro":
            statusColor = "#ef4444"
            priority = 1
            break
          case "sem retorno":
            statusColor = "#8b5cf6"
            priority = 2
            break
          case "em andamento":
            statusColor = "#06b6d4"
            priority = 4
            break
          default:
            statusColor = "#6b7280"
            priority = 3
        }

        return {
          status,
          count,
          color: statusColor,
          percentage: ((count / data.totalRecords) * 100).toFixed(1),
          priority,
        }
      })
      .sort((a, b) => a.priority - b.priority) // Ordenar por prioridade

    return {
      statusData,
      timelineData: executiveMetrics.timelineData,
      pieData: statusData.map((item) => ({
        name: item.status,
        value: item.count,
        color: item.color,
      })),
    }
  }, [data, executiveMetrics])

  // Alertas Executivos
  const executiveAlerts = useMemo(() => {
    const alerts = []
    const metrics = executiveMetrics.statusBreakdown

    if (isRollout) {
      if (metrics.noResponseRate > 25) {
        alerts.push({
          type: "critical",
          title: "Cronograma em Risco",
          message: `${metrics.noResponseRate.toFixed(0)}% das lojas sem confirmação`,
          action: "Estabelecer prazo limite de 48h",
          impact: "Alto risco de atraso no cronograma",
        })
      }

      if (metrics.completionRate > 80) {
        alerts.push({
          type: "success",
          title: "Reta Final do Rollout",
          message: `${metrics.completed} de ${metrics.total} lojas migradas`,
          action: "Agendar desativação do sistema antigo",
          impact: "Cronograma dentro do prazo",
        })
      }

      if (metrics.completionRate < 50 && metrics.noResponseRate < 25) {
        alerts.push({
          type: "warning",
          title: "Ritmo de Migração Lento",
          message: `Apenas ${metrics.completionRate.toFixed(0)}% concluído`,
          action: "Reforçar equipe de suporte",
          impact: "Possível atraso no cronograma",
        })
      }
    } else {
      if (metrics.errorRate > 10) {
        alerts.push({
          type: "critical",
          title: "Qualidade Crítica",
          message: `${metrics.errorRate.toFixed(0)}% de falhas técnicas`,
          action: "PAUSAR novos testes imediatamente",
          impact: "Risco de instabilidade em produção",
        })
      }

      if (metrics.errorRate === 0 && metrics.completionRate > 70) {
        alerts.push({
          type: "success",
          title: "Qualidade Excelente",
          message: "Zero erros técnicos detectados",
          action: "Manter padrão e expandir testes",
          impact: "Integração estável e confiável",
        })
      }

      if (metrics.noResponseRate > 40) {
        alerts.push({
          type: "warning",
          title: "Comunicação Deficiente",
          message: `${metrics.noResponseRate.toFixed(0)}% sem retorno`,
          action: "Implementar follow-up automático",
          impact: "Atraso na validação dos testes",
        })
      }
    }

    return alerts
  }, [executiveMetrics, isRollout])

  const handleExport = () => {
    try {
      const metrics = executiveMetrics.statusBreakdown
      const timestamp = new Date().toLocaleString("pt-BR")

      const exportData = {
        relatorio: "Dashboard Executivo",
        tipo: isRollout ? "Rollout de Migração" : "Testes de Integração",
        dataHora: timestamp,
        resumoExecutivo: {
          scoreExecutivo: `${executiveMetrics.executiveScore.value}/100`,
          statusGeral: executiveMetrics.executiveStatus,
          totalItens: metrics.total,
          concluidos: `${metrics.completed} (${metrics.completionRate.toFixed(1)}%)`,
          critico: isRollout
            ? `${metrics.noResponse} sem confirmação (${metrics.noResponseRate.toFixed(1)}%)`
            : `${metrics.errors} falhas técnicas (${metrics.errorRate.toFixed(1)}%)`,
        },
        detalhamento: Object.entries(data.statusCounts).map(([status, count]) => ({
          status,
          quantidade: count,
          percentual: `${((count / data.totalRecords) * 100).toFixed(1)}%`,
        })),
        alertas: executiveAlerts.map((alert) => ({
          tipo: alert.type,
          titulo: alert.title,
          mensagem: alert.message,
          acao: alert.action,
          impacto: alert.impact,
        })),
      }

      const csvContent = [
        "RELATÓRIO EXECUTIVO",
        `Tipo,${exportData.tipo}`,
        `Data/Hora,${exportData.dataHora}`,
        `Score Executivo,${exportData.resumoExecutivo.scoreExecutivo}`,
        `Status Geral,${exportData.resumoExecutivo.statusGeral}`,
        `Total de Itens,${exportData.resumoExecutivo.totalItens}`,
        `Concluídos,${exportData.resumoExecutivo.concluidos}`,
        `Métrica Crítica,${exportData.resumoExecutivo.critico}`,
        "",
        "DETALHAMENTO POR STATUS",
        "Status,Quantidade,Percentual",
        ...exportData.detalhamento.map((item) => `${item.status},${item.quantidade},${item.percentual}`),
        "",
        "ALERTAS EXECUTIVOS",
        "Tipo,Título,Mensagem,Ação,Impacto",
        ...exportData.alertas.map(
          (alert) => `${alert.tipo},${alert.titulo},${alert.mensagem},${alert.acao},${alert.impacto}`,
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `relatorio-executivo-${data.tabName}-${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success("Relatório executivo exportado com sucesso!")
    } catch (error) {
      toast.error("Erro ao exportar relatório executivo")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header Executivo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={onBack} className="shadow-sm hover:shadow-md transition-all">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{data.tabName}</h1>
              <p className="text-slate-600">
                Dashboard Executivo • {isRollout ? "Rollout de Migração" : "Testes de Integração"}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge
                variant={isRollout ? "default" : "secondary"}
                className={`${isRollout ? "bg-blue-600" : "bg-purple-600"} text-white`}
              >
                {isRollout ? "Rollout" : "Testes"}
              </Badge>
              <Badge
                variant="outline"
                className="border-2"
                style={{
                  borderColor: executiveMetrics.statusColor,
                  color: executiveMetrics.statusColor,
                }}
              >
                {executiveMetrics.executiveStatus}
              </Badge>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant={viewMode === "macro" ? "default" : "outline"}
              onClick={() => setViewMode("macro")}
              className="shadow-sm hover:shadow-md transition-all"
            >
              <Eye className="w-4 h-4 mr-2" />
              Visão Macro
            </Button>

            <Button
              variant={viewMode === "micro" ? "default" : "outline"}
              onClick={() => setViewMode("micro")}
              className="shadow-sm hover:shadow-md transition-all"
            >
              <EyeOff className="w-4 h-4 mr-2" />
              Visão Micro
            </Button>

            <Button onClick={handleExport} variant="outline" className="shadow-sm hover:shadow-md transition-all">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Alertas Executivos */}
        {executiveAlerts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {executiveAlerts.map((alert, index) => (
              <Card
                key={index}
                className={`border-l-4 ${
                  alert.type === "critical"
                    ? "border-l-red-500 bg-red-50/50"
                    : alert.type === "warning"
                      ? "border-l-yellow-500 bg-yellow-50/50"
                      : "border-l-green-500 bg-green-50/50"
                } shadow-sm hover:shadow-md transition-all`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        alert.type === "critical"
                          ? "bg-red-100 text-red-600"
                          : alert.type === "warning"
                            ? "bg-yellow-100 text-yellow-600"
                            : "bg-green-100 text-green-600"
                      }`}
                    >
                      {alert.type === "critical" ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : alert.type === "warning" ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 mb-1">{alert.title}</h4>
                      <p className="text-sm text-slate-600 mb-2">{alert.message}</p>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-700">
                          <Zap className="w-3 h-3 inline mr-1" />
                          Ação: {alert.action}
                        </p>
                        <p className="text-xs text-slate-500">Impacto: {alert.impact}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* KPIs Executivos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(executiveMetrics)
            .filter(([key]) => ["totalItems", "executiveScore", "completionRate", "criticalMetric"].includes(key))
            .map(([key, kpi]) => {
              const IconComponent = kpi.icon

              return (
                <Card
                  key={key}
                  className="relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50/50" />
                  <CardContent className="relative p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center`}
                        style={{ backgroundColor: `${kpi.color}15` }}
                      >
                        <IconComponent className="w-6 h-6" style={{ color: kpi.color }} />
                      </div>
                      {key === "executiveScore" && (
                        <div className="flex items-center space-x-1">
                          {kpi.value >= 80 ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          ) : kpi.value >= 60 ? (
                            <Activity className="w-4 h-4 text-yellow-600" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-slate-600 uppercase tracking-wide">{kpi.label}</h3>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-3xl font-bold text-slate-900">
                          {key === "executiveScore" || key === "completionRate" || key === "criticalMetric"
                            ? `${kpi.value.toFixed(1)}${key === "totalItems" ? "" : "%"}`
                            : kpi.value.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{kpi.sublabel}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
        </div>

        {/* AI Insights Panel Executivo */}
        <AIInsightsPanel data={data} isExecutive={true} />

        {/* Gráficos Executivos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Distribuição por Status */}
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold text-slate-900">Distribuição por Status</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={selectedChart === "bar" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedChart("bar")}
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={selectedChart === "pie" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedChart("pie")}
                  >
                    <PieChartIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                {selectedChart === "bar" ? (
                  <BarChart data={chartData.statusData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="status"
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      }}
                      formatter={(value, name) => [value, "Quantidade"]}
                      labelFormatter={(label) => `Status: ${label}`}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                      {chartData.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={chartData.pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {chartData.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cronograma (para Rollout) ou Tendência (para Testes) */}
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-slate-900">
                {isRollout ? "Cronograma de Migração" : "Tendência de Qualidade"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                {isRollout ? (
                  <AreaChart data={chartData.timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      }}
                      labelFormatter={(label) => `Data: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      stackId="1"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.6}
                      name="Concluídas"
                    />
                    <Area
                      type="monotone"
                      dataKey="scheduled"
                      stackId="1"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                      name="Agendadas"
                    />
                    <Area
                      type="monotone"
                      dataKey="pending"
                      stackId="1"
                      stroke="#f59e0b"
                      fill="#f59e0b"
                      fillOpacity={0.6}
                      name="Pendentes"
                    />
                    <Area
                      type="monotone"
                      dataKey="noResponse"
                      stackId="1"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.6}
                      name="Sem Retorno"
                    />
                    <Area
                      type="monotone"
                      dataKey="errors"
                      stackId="1"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.6}
                      name="Erros"
                    />
                  </AreaChart>
                ) : (
                  <LineChart data={chartData.timelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="completionRate"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                      name="Taxa de Conclusão (%)"
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Visão Detalhada (Micro) */}
        {viewMode === "micro" && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-900">
                Análise Detalhada • {isRollout ? "Rollout de Lojas" : "Testes de Integração"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                  <TabsTrigger value="status">Status Detalhado</TabsTrigger>
                  <TabsTrigger value="timeline">Cronograma</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Object.entries(data.statusCounts).map(([status, count]) => {
                      let statusColor = "bg-gray-100 text-gray-800 border-gray-300"
                      let statusIcon = <Activity className="w-4 h-4" />

                      switch (status.toLowerCase()) {
                        case "concluído":
                        case "concluido":
                          statusColor = "bg-green-100 text-green-800 border-green-300"
                          statusIcon = <CheckCircle className="w-4 h-4" />
                          break
                        case "pendente":
                          statusColor = "bg-yellow-100 text-yellow-800 border-yellow-300"
                          statusIcon = <Clock className="w-4 h-4" />
                          break
                        case "agendado":
                          statusColor = "bg-blue-100 text-blue-800 border-blue-300"
                          statusIcon = <Calendar className="w-4 h-4" />
                          break
                        case "erro":
                          statusColor = "bg-red-100 text-red-800 border-red-300"
                          statusIcon = <AlertTriangle className="w-4 h-4" />
                          break
                        case "sem retorno":
                          statusColor = "bg-purple-100 text-purple-800 border-purple-300"
                          statusIcon = <XCircle className="w-4 h-4" />
                          break
                        case "em andamento":
                          statusColor = "bg-cyan-100 text-cyan-800 border-cyan-300"
                          statusIcon = <Activity className="w-4 h-4" />
                          break
                      }

                      return (
                        <Card key={status} className={`border ${statusColor}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {statusIcon}
                                <div>
                                  <p className="text-sm font-medium">{status}</p>
                                  <p className="text-2xl font-bold">{count}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs">{((count / data.totalRecords) * 100).toFixed(1)}%</p>
                                <div className="w-12 h-2 bg-gray-200 rounded-full mt-1">
                                  <div
                                    className="h-2 bg-current rounded-full transition-all duration-500"
                                    style={{ width: `${(count / data.totalRecords) * 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="status" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Métricas Críticas */}
                    <Card className="border border-slate-200">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold">Métricas Críticas</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Taxa de Conclusão</span>
                            <span className="font-semibold text-green-600">
                              {executiveMetrics.statusBreakdown.completionRate.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${executiveMetrics.statusBreakdown.completionRate}%` }}
                            />
                          </div>
                        </div>

                        {isRollout ? (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">Sem Confirmação</span>
                              <span
                                className={`font-semibold ${
                                  executiveMetrics.statusBreakdown.noResponseRate > 25
                                    ? "text-red-600"
                                    : executiveMetrics.statusBreakdown.noResponseRate > 15
                                      ? "text-yellow-600"
                                      : "text-green-600"
                                }`}
                              >
                                {executiveMetrics.statusBreakdown.noResponseRate.toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${
                                  executiveMetrics.statusBreakdown.noResponseRate > 25
                                    ? "bg-red-500"
                                    : executiveMetrics.statusBreakdown.noResponseRate > 15
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                                }`}
                                style={{ width: `${executiveMetrics.statusBreakdown.noResponseRate}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">Falhas Técnicas</span>
                              <span
                                className={`font-semibold ${
                                  executiveMetrics.statusBreakdown.errorRate > 10
                                    ? "text-red-600"
                                    : executiveMetrics.statusBreakdown.errorRate > 5
                                      ? "text-yellow-600"
                                      : "text-green-600"
                                }`}
                              >
                                {executiveMetrics.statusBreakdown.errorRate.toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${
                                  executiveMetrics.statusBreakdown.errorRate > 10
                                    ? "bg-red-500"
                                    : executiveMetrics.statusBreakdown.errorRate > 5
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                                }`}
                                style={{ width: `${Math.min(100, executiveMetrics.statusBreakdown.errorRate * 2)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Resumo Executivo */}
                    <Card className="border border-slate-200">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold">Resumo Executivo</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: executiveMetrics.statusColor }}
                            />
                            <span className="font-medium text-slate-900">{executiveMetrics.executiveStatus}</span>
                          </div>

                          <div className="text-sm text-slate-600 space-y-2">
                            <p>
                              <strong>Score Executivo:</strong> {executiveMetrics.executiveScore.value}/100
                            </p>
                            <p>
                              <strong>Total:</strong> {executiveMetrics.totalItems.value}{" "}
                              {isRollout ? "lojas" : "testes"}
                            </p>
                            <p>
                              <strong>Concluídos:</strong> {executiveMetrics.statusBreakdown.completed} (
                              {executiveMetrics.statusBreakdown.completionRate.toFixed(1)}%)
                            </p>
                            {isRollout ? (
                              <p>
                                <strong>Sem Confirmação:</strong> {executiveMetrics.statusBreakdown.noResponse} (
                                {executiveMetrics.statusBreakdown.noResponseRate.toFixed(1)}%)
                              </p>
                            ) : (
                              <p>
                                <strong>Falhas Técnicas:</strong> {executiveMetrics.statusBreakdown.errors} (
                                {executiveMetrics.statusBreakdown.errorRate.toFixed(1)}%)
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="timeline" className="space-y-6">
                  {isRollout ? (
                    <div className="space-y-6">
                      <Card className="border border-slate-200">
                        <CardHeader>
                          <CardTitle className="text-lg font-semibold">
                            Cronograma de Migração (Últimos 14 dias)
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={executiveMetrics.timelineData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                              <YAxis tick={{ fontSize: 12 }} />
                              <Tooltip
                                labelFormatter={(label) => `Data: ${label}`}
                                formatter={(value, name) => [value, name]}
                              />
                              <Area
                                type="monotone"
                                dataKey="completed"
                                stackId="1"
                                stroke="#10b981"
                                fill="#10b981"
                                fillOpacity={0.6}
                                name="Concluídas"
                              />
                              <Area
                                type="monotone"
                                dataKey="scheduled"
                                stackId="1"
                                stroke="#3b82f6"
                                fill="#3b82f6"
                                fillOpacity={0.6}
                                name="Agendadas"
                              />
                              <Area
                                type="monotone"
                                dataKey="pending"
                                stackId="1"
                                stroke="#f59e0b"
                                fill="#f59e0b"
                                fillOpacity={0.6}
                                name="Pendentes"
                              />
                              <Area
                                type="monotone"
                                dataKey="noResponse"
                                stackId="1"
                                stroke="#8b5cf6"
                                fill="#8b5cf6"
                                fillOpacity={0.6}
                                name="Sem Retorno"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="text-center p-4">
                          <div className="text-2xl font-bold text-green-600">
                            {executiveMetrics.statusBreakdown.completed}
                          </div>
                          <div className="text-sm text-slate-600">Lojas Migradas</div>
                        </Card>
                        <Card className="text-center p-4">
                          <div className="text-2xl font-bold text-blue-600">
                            {executiveMetrics.statusBreakdown.scheduled}
                          </div>
                          <div className="text-sm text-slate-600">Agendadas</div>
                        </Card>
                        <Card className="text-center p-4">
                          <div className="text-2xl font-bold text-yellow-600">
                            {executiveMetrics.statusBreakdown.pending}
                          </div>
                          <div className="text-sm text-slate-600">Pendentes</div>
                        </Card>
                        <Card className="text-center p-4">
                          <div className="text-2xl font-bold text-purple-600">
                            {executiveMetrics.statusBreakdown.noResponse}
                          </div>
                          <div className="text-sm text-slate-600">Sem Retorno</div>
                        </Card>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <Card className="border border-slate-200">
                        <CardHeader>
                          <CardTitle className="text-lg font-semibold">Evolução da Qualidade dos Testes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={executiveMetrics.timelineData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                              <YAxis tick={{ fontSize: 12 }} />
                              <Tooltip />
                              <Line
                                type="monotone"
                                dataKey="completionRate"
                                stroke="#10b981"
                                strokeWidth={3}
                                dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                                name="Taxa de Conclusão (%)"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <Card className="text-center p-4">
                          <div className="text-2xl font-bold text-green-600">
                            {executiveMetrics.statusBreakdown.completed}
                          </div>
                          <div className="text-sm text-slate-600">Concluídos</div>
                        </Card>
                        <Card className="text-center p-4">
                          <div className="text-2xl font-bold text-blue-600">
                            {executiveMetrics.statusBreakdown.scheduled}
                          </div>
                          <div className="text-sm text-slate-600">Agendados</div>
                        </Card>
                        <Card className="text-center p-4">
                          <div className="text-2xl font-bold text-yellow-600">
                            {executiveMetrics.statusBreakdown.pending}
                          </div>
                          <div className="text-sm text-slate-600">Pendentes</div>
                        </Card>
                        <Card className="text-center p-4">
                          <div className="text-2xl font-bold text-red-600">
                            {executiveMetrics.statusBreakdown.errors}
                          </div>
                          <div className="text-sm text-slate-600">Erros</div>
                        </Card>
                        <Card className="text-center p-4">
                          <div className="text-2xl font-bold text-purple-600">
                            {executiveMetrics.statusBreakdown.noResponse}
                          </div>
                          <div className="text-sm text-slate-600">Sem Retorno</div>
                        </Card>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
