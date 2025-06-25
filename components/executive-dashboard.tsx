"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  ChevronDown,
  ChevronUp,
  BarChart3,
  PieChartIcon,
  XCircle,
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
  const [selectedPeriod, setSelectedPeriod] = useState("30d")
  const [viewMode, setViewMode] = useState<"macro" | "micro">("macro")
  const [expandedKPI, setExpandedKPI] = useState<string | null>(null)
  const [selectedChart, setSelectedChart] = useState<"bar" | "line" | "pie">("bar")

  // Determinar tipo de dashboard
  const dashboardType = data.dashboardType || "rollout"
  const isRollout = dashboardType === "rollout"

  // KPIs Executivos Calculados - CORRIGIDO PARA TRATAR "SEM RETORNO" ADEQUADAMENTE
  const executiveKPIs = useMemo(() => {
    const total = data.totalRecords
    const statusEntries = Object.entries(data.statusCounts)

    console.log("=== CALCULANDO KPIs EXECUTIVOS ===")
    console.log("Status counts:", data.statusCounts)

    // Concluídos (sucesso real)
    const completed =
      (data.statusCounts["Concluído"] || 0) +
      (data.statusCounts["Concluido"] || 0) +
      (data.statusCounts["Aprovado"] || 0)

    // Pendentes (aguardando ação)
    const pending = (data.statusCounts["Pendente"] || 0) + (data.statusCounts["Aguardando"] || 0)

    // Em progresso
    const inProgress = (data.statusCounts["Agendado"] || 0) + (data.statusCounts["Em Andamento"] || 0)

    // Falhas reais (erros)
    const failed =
      (data.statusCounts["Falhou"] || 0) + (data.statusCounts["Reprovado"] || 0) + (data.statusCounts["Erro"] || 0)

    // Sem retorno (categoria especial - não é erro nem sucesso)
    const noResponse = (data.statusCounts["Sem retorno"] || 0) + (data.statusCounts["Sem Retorno"] || 0)

    const completionRate = total > 0 ? (completed / total) * 100 : 0
    const pendingRate = total > 0 ? ((pending + noResponse) / total) * 100 : 0
    const failureRate = total > 0 ? (failed / total) * 100 : 0
    const performanceRate = total > 0 ? ((completed + inProgress) / total) * 100 : 0

    console.log("KPIs calculados:")
    console.log("- Concluídos:", completed)
    console.log("- Pendentes:", pending)
    console.log("- Em progresso:", inProgress)
    console.log("- Falhas:", failed)
    console.log("- Sem retorno:", noResponse)
    console.log("- Taxa conclusão:", completionRate.toFixed(1) + "%")
    console.log("- Taxa pendência:", pendingRate.toFixed(1) + "%")
    console.log("- Taxa falha:", failureRate.toFixed(1) + "%")
    console.log("=== FIM KPIs EXECUTIVOS ===")

    // Simular dados de tendência (últimos 7 dias) - DADOS MAIS REALISTAS
    const trendData = Array.from({ length: 7 }, (_, i) => {
      const dayProgress = (i + 1) / 7 // progresso do dia (0.14 a 1.0)
      const baseCompleted = Math.floor(completed * dayProgress)
      const basePending = Math.floor((pending + noResponse) * (1 - dayProgress * 0.5))
      const baseFailed = Math.floor(failed * dayProgress * 0.3)

      return {
        day: `Dia ${i + 1}`,
        completed: Math.max(0, baseCompleted + Math.floor(Math.random() * 5 - 2)),
        pending: Math.max(0, basePending + Math.floor(Math.random() * 3 - 1)),
        failed: Math.max(0, baseFailed + Math.floor(Math.random() * 2)),
        noResponse: Math.max(0, Math.floor(noResponse * dayProgress * 0.8)),
        total: Math.max(0, total - Math.floor(Math.random() * 5)),
      }
    })

    return {
      totalItems: {
        value: total,
        label: isRollout ? "Total de Lojas" : "Total de Testes",
        trend: "+12%",
        trendUp: true,
        icon: isRollout ? Users : Activity,
        color: COLORS.info,
        details: `${total} ${isRollout ? "lojas" : "testes"} no sistema`,
      },
      completionRate: {
        value: completionRate,
        label: "Taxa de Conclusão",
        trend: "+8.5%",
        trendUp: true,
        icon: CheckCircle,
        color: completionRate >= 80 ? COLORS.success : completionRate >= 60 ? COLORS.warning : COLORS.danger,
        details: `${completed} de ${total} concluídos`,
      },
      pendingItems: {
        value: pending + noResponse,
        label: "Itens Pendentes",
        trend: "-5.2%",
        trendUp: false,
        icon: Clock,
        color: pendingRate > 30 ? COLORS.danger : pendingRate > 15 ? COLORS.warning : COLORS.success,
        details: `${pendingRate.toFixed(1)}% do total (${pending} pendentes + ${noResponse} sem retorno)`,
      },
      performance: {
        value: Math.round(performanceRate),
        label: "Performance Geral",
        trend: "+3.1%",
        trendUp: true,
        icon: Target,
        color: failureRate < 5 ? COLORS.success : failureRate < 15 ? COLORS.warning : COLORS.danger,
        details: `${failureRate.toFixed(1)}% de falhas, ${failed} erros + ${noResponse} sem retorno`,
      },
      productivity: {
        value: Math.round(performanceRate),
        label: "Produtividade",
        trend: "+15.3%",
        trendUp: true,
        icon: TrendingUp,
        color: COLORS.info,
        details: `${completed + inProgress} itens ativos`,
      },
      trendData,
    }
  }, [data, isRollout])

  // Dados para gráficos
  const chartData = useMemo(() => {
    const statusData = Object.entries(data.statusCounts).map(([status, count], index) => {
      // Definir cor específica baseada no status
      let statusColor = CHART_COLORS[index % CHART_COLORS.length] // fallback

      switch (status.toLowerCase()) {
        case "concluído":
        case "concluido":
        case "aprovado":
        case "passou":
          statusColor = "#10b981" // verde
          break
        case "pendente":
        case "aguardando":
        case "não testado":
          statusColor = "#f59e0b" // amarelo
          break
        case "agendado":
        case "executando":
        case "testando":
          statusColor = "#3b82f6" // azul
          break
        case "em andamento":
          statusColor = "#8b5cf6" // roxo
          break
        case "erro":
          statusColor = "#ef4444" // vermelho
          break
        case "sem retorno":
          statusColor = "#8b5cf6" // roxo
          break
        default:
          statusColor = "#6b7280" // cinza
      }

      return {
        status,
        count,
        color: statusColor,
        percentage: ((count / data.totalRecords) * 100).toFixed(1),
      }
    })

    return {
      statusData,
      trendData: executiveKPIs.trendData,
      pieData: statusData.map((item) => ({
        name: item.status,
        value: item.count,
        color: item.color,
      })),
    }
  }, [data, executiveKPIs])

  // Alertas Críticos - ATUALIZADO PARA TRATAR "SEM RETORNO" ADEQUADAMENTE
  const criticalAlerts = useMemo(() => {
    const alerts = []
    const completionRate = executiveKPIs.completionRate.value
    const pendingRate = (executiveKPIs.pendingItems.value / data.totalRecords) * 100
    const errorCount = data.statusCounts["Erro"] || 0
    const noResponseCount = (data.statusCounts["Sem retorno"] || 0) + (data.statusCounts["Sem Retorno"] || 0)

    if (completionRate < 50) {
      alerts.push({
        type: "danger",
        title: "Taxa de Conclusão Baixa",
        message: `Apenas ${completionRate.toFixed(1)}% concluído`,
        action: "Revisar processos",
      })
    }

    if (errorCount > 0) {
      alerts.push({
        type: "danger",
        title: "Erros Detectados",
        message: `${errorCount} erro(s) registrado(s)`,
        action: "Investigar falhas imediatamente",
      })
    }

    if (noResponseCount > 0) {
      alerts.push({
        type: "warning",
        title: "Itens Sem Retorno",
        message: `${noResponseCount} item(ns) sem resposta`,
        action: "Verificar comunicação e acompanhar",
      })
    }

    if (pendingRate > 40) {
      alerts.push({
        type: "warning",
        title: "Alto Volume Pendente",
        message: `${pendingRate.toFixed(1)}% dos itens pendentes`,
        action: "Priorizar execução",
      })
    }

    if (data.totalRecords === 0) {
      alerts.push({
        type: "info",
        title: "Sem Dados",
        message: "Nenhum registro encontrado",
        action: "Verificar integração",
      })
    }

    return alerts
  }, [executiveKPIs, data])

  const handleExport = () => {
    try {
      const noResponseCount = (data.statusCounts["Sem retorno"] || 0) + (data.statusCounts["Sem Retorno"] || 0)

      const exportData = {
        resumo: {
          totalItens: executiveKPIs.totalItems.value,
          taxaConclusao: `${executiveKPIs.completionRate.value.toFixed(1)}%`,
          itensPendentes: executiveKPIs.pendingItems.value,
          performanceGeral: `${executiveKPIs.performance.value}%`,
          erros: data.statusCounts["Erro"] || 0,
          semRetorno: noResponseCount,
        },
        detalhes: data.recentActivity.map((row) => ({
          ...row,
          tipo: isRollout ? "Rollout" : "Teste",
        })),
      }

      const csvContent = [
        "RESUMO EXECUTIVO",
        `Total de ${isRollout ? "Lojas" : "Testes"},${executiveKPIs.totalItems.value}`,
        `Taxa de Conclusão,${executiveKPIs.completionRate.value.toFixed(1)}%`,
        `Itens Pendentes,${executiveKPIs.pendingItems.value}`,
        `Performance Geral,${executiveKPIs.performance.value}%`,
        `Erros,${data.statusCounts["Erro"] || 0}`,
        `Sem Retorno,${noResponseCount}`,
        "",
        "DETALHES POR STATUS",
        ...Object.entries(data.statusCounts).map(
          ([status, count]) => `${status},${count},${((count / data.totalRecords) * 100).toFixed(1)}%`,
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `dashboard-executivo-${data.tabName}-${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success("Relatório executivo exportado com sucesso!")
    } catch (error) {
      toast.error("Erro ao exportar relatório")
    }
  }

  const toggleKPIDetails = (kpiKey: string) => {
    setExpandedKPI(expandedKPI === kpiKey ? null : kpiKey)
  }

  // Função para obter cor do status - CORRIGIDA
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "concluído":
      case "concluido":
      case "aprovado":
      case "passou":
        return "bg-green-100 text-green-800 border-green-300"
      case "pendente":
      case "aguardando":
      case "não testado":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "agendado":
      case "executando":
      case "testando":
        return "bg-blue-100 text-blue-800 border-blue-300"
      case "em andamento":
        return "bg-purple-100 text-purple-800 border-purple-300"
      case "erro":
        return "bg-red-100 text-red-800 border-red-300"
      case "sem retorno":
        return "bg-purple-100 text-purple-800 border-purple-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  // Função para obter ícone do status - CORRIGIDA
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "concluído":
      case "concluido":
      case "aprovado":
      case "passou":
        return <CheckCircle className="w-4 h-4" />
      case "pendente":
      case "aguardando":
      case "não testado":
        return <Clock className="w-4 h-4" />
      case "agendado":
      case "executando":
      case "testando":
        return <Activity className="w-4 h-4" />
      case "erro":
        return <AlertTriangle className="w-4 h-4" />
      case "sem retorno":
        return <XCircle className="w-4 h-4" />
      default:
        return <TrendingUp className="w-4 h-4" />
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
              <p className="text-slate-600">Dashboard Executivo • Atualizado em tempo real</p>
            </div>
            <Badge variant={isRollout ? "default" : "secondary"} className="ml-4">
              {isRollout ? "Rollout" : "Testes de Integração"}
            </Badge>
          </div>

          <div className="flex items-center space-x-3">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32 shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 dias</SelectItem>
                <SelectItem value="30d">30 dias</SelectItem>
                <SelectItem value="90d">90 dias</SelectItem>
                <SelectItem value="1y">1 ano</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={viewMode === "macro" ? "default" : "outline"}
              onClick={() => setViewMode("macro")}
              className="shadow-sm hover:shadow-md transition-all"
            >
              <Eye className="w-4 h-4 mr-2" />
              Macro
            </Button>

            <Button
              variant={viewMode === "micro" ? "default" : "outline"}
              onClick={() => setViewMode("micro")}
              className="shadow-sm hover:shadow-md transition-all"
            >
              <EyeOff className="w-4 h-4 mr-2" />
              Micro
            </Button>

            <Button onClick={handleExport} variant="outline" className="shadow-sm hover:shadow-md transition-all">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Alertas Críticos */}
        {criticalAlerts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {criticalAlerts.map((alert, index) => (
              <Card
                key={index}
                className={`border-l-4 ${
                  alert.type === "danger"
                    ? "border-l-red-500 bg-red-50/50"
                    : alert.type === "warning"
                      ? "border-l-yellow-500 bg-yellow-50/50"
                      : "border-l-blue-500 bg-blue-50/50"
                } shadow-sm hover:shadow-md transition-all`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle
                      className={`w-5 h-5 mt-0.5 ${
                        alert.type === "danger"
                          ? "text-red-600"
                          : alert.type === "warning"
                            ? "text-yellow-600"
                            : "text-blue-600"
                      }`}
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">{alert.title}</h4>
                      <p className="text-sm text-slate-600 mt-1">{alert.message}</p>
                      <p className="text-xs text-slate-500 mt-2 font-medium">{alert.action}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* KPIs Executivos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {Object.entries(executiveKPIs)
            .filter(([key]) => key !== "trendData")
            .map(([key, kpi]) => {
              const IconComponent = kpi.icon
              const isExpanded = expandedKPI === key

              return (
                <Card
                  key={key}
                  className="relative overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
                  onClick={() => toggleKPIDetails(key)}
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
                      <div className="flex items-center space-x-1">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            kpi.trendUp ? "text-green-700 bg-green-100" : "text-red-700 bg-red-100"
                          }`}
                        >
                          {kpi.trendUp ? (
                            <TrendingUp className="w-3 h-3 inline mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 inline mr-1" />
                          )}
                          {kpi.trend}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-slate-600 uppercase tracking-wide">{kpi.label}</h3>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-3xl font-bold text-slate-900">
                          {(typeof kpi.value === "number" && kpi.label.includes("Taxa")) ||
                          kpi.label.includes("Performance")
                            ? `${kpi.value.toFixed(1)}%`
                            : kpi.value.toLocaleString()}
                        </span>
                      </div>

                      {viewMode === "micro" && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <p className="text-xs text-slate-500">{kpi.details}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
        </div>

        {/* AI Insights Panel */}
        <AIInsightsPanel data={data} isExecutive={true} />

        {/* Gráficos Principais */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Gráfico de Status */}
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
                    <XAxis dataKey="status" tick={{ fontSize: 12, fill: "#64748b" }} />
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
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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
                      label={({ name, value, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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

          {/* Gráfico de Tendência */}
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-slate-900">Tendência de Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={chartData.trendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stackId="1"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="pending"
                    stackId="1"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="noResponse"
                    stackId="1"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="failed"
                    stackId="1"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.6}
                  />
                </AreaChart>
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
                  <TabsTrigger value="details">Detalhes</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Object.entries(data.statusCounts).map(([status, count]) => (
                      <Card key={status} className={`border ${getStatusColor(status)}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(status)}
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
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  <div className="space-y-6">
                    {/* Resumo Detalhado */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {Object.entries(data.statusCounts).map(([status, count]) => (
                        <Card key={status} className={`border ${getStatusColor(status)}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(status)}
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
                      ))}
                    </div>

                    {/* Lista Completa de Itens */}
                    <Card className="border border-slate-200">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold">
                          {isRollout ? "Todas as Lojas" : "Todos os Testes"} ({data.totalRecords} itens)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="max-h-96 overflow-y-auto space-y-3">
                          {data.recentActivity.map((item, index) => {
                            const itemName = isRollout
                              ? item.loja ||
                                item.restaurante ||
                                item.cliente ||
                                item.nome ||
                                item.unidade ||
                                `Loja ${index + 1}`
                              : item.nome_do_restaurante ||
                                item.pdv_integradora ||
                                item.terminal ||
                                item.equipamento ||
                                item.nome_pdv ||
                                item.nome_teste ||
                                item.teste ||
                                `Teste ${index + 1}`

                            return (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                              >
                                <div className="flex-1">
                                  <h4 className="font-medium text-slate-900">{itemName}</h4>
                                  {item.observacao && (
                                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                                      {item.observacao.length > 150
                                        ? `${item.observacao.substring(0, 150)}...`
                                        : item.observacao}
                                    </p>
                                  )}
                                  <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                                    {isRollout ? (
                                      <>
                                        <span>
                                          Sistema:{" "}
                                          {item.status === "Concluído" || item.status === "Concluido"
                                            ? "Novo"
                                            : "Antigo"}
                                        </span>
                                        {item.data_de_agendamento && <span>Data: {item.data_de_agendamento}</span>}
                                      </>
                                    ) : (
                                      <>
                                        <span>PDV: {item.pdv_integradora || "N/A"}</span>
                                        <span>Solicitante: {item.solicitante || "N/A"}</span>
                                        {item.carimbo_de_data_hora && <span>Data: {item.carimbo_de_data_hora}</span>}
                                      </>
                                    )}
                                  </div>
                                </div>
                                <Badge className={`ml-4 ${getStatusColor(item.status || "Sem Status")}`}>
                                  {item.status || "Sem Status"}
                                </Badge>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="analytics" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Análise de Performance */}
                    <Card className="border border-slate-200">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold">Análise de Performance</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Taxa de Sucesso</span>
                            <span className="font-semibold text-green-600">
                              {executiveKPIs.completionRate.value.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${executiveKPIs.completionRate.value}%` }}
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">Produtividade</span>
                            <span className="font-semibold text-blue-600">{executiveKPIs.productivity.value}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${executiveKPIs.productivity.value}%` }}
                            />
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-200">
                          <h4 className="font-medium text-slate-900 mb-2">Insights Automáticos</h4>
                          <div className="space-y-2">
                            {executiveKPIs.completionRate.value > 80 && (
                              <div className="flex items-center space-x-2 text-sm text-green-700 bg-green-50 p-2 rounded">
                                <CheckCircle className="w-4 h-4" />
                                <span>Excelente taxa de conclusão!</span>
                              </div>
                            )}
                            {executiveKPIs.pendingItems.value > data.totalRecords * 0.3 && (
                              <div className="flex items-center space-x-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                                <AlertTriangle className="w-4 h-4" />
                                <span>Alto volume de itens pendentes requer atenção</span>
                              </div>
                            )}
                            {(data.statusCounts["Erro"] || 0) > 0 && (
                              <div className="flex items-center space-x-2 text-sm text-red-700 bg-red-50 p-2 rounded">
                                <AlertTriangle className="w-4 h-4" />
                                <span>Erros detectados - investigação necessária</span>
                              </div>
                            )}
                            {(data.statusCounts["Sem retorno"] || 0) + (data.statusCounts["Sem Retorno"] || 0) > 0 && (
                              <div className="flex items-center space-x-2 text-sm text-purple-700 bg-purple-50 p-2 rounded">
                                <XCircle className="w-4 h-4" />
                                <span>Itens sem retorno precisam de acompanhamento</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-2 text-sm text-blue-700 bg-blue-50 p-2 rounded">
                              <TrendingUp className="w-4 h-4" />
                              <span>Tendência de crescimento identificada</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Distribuição Temporal */}
                    <Card className="border border-slate-200">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold">Distribuição Temporal</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                          <AreaChart data={executiveKPIs.trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Area
                              type="monotone"
                              dataKey="completed"
                              stackId="1"
                              stroke="#10b981"
                              fill="#10b981"
                              fillOpacity={0.6}
                            />
                            <Area
                              type="monotone"
                              dataKey="pending"
                              stackId="1"
                              stroke="#f59e0b"
                              fill="#f59e0b"
                              fillOpacity={0.6}
                            />
                            <Area
                              type="monotone"
                              dataKey="noResponse"
                              stackId="1"
                              stroke="#8b5cf6"
                              fill="#8b5cf6"
                              fillOpacity={0.6}
                            />
                            <Area
                              type="monotone"
                              dataKey="failed"
                              stackId="1"
                              stroke="#ef4444"
                              fill="#ef4444"
                              fillOpacity={0.6}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Métricas Avançadas */}
                    <Card className="border border-slate-200 lg:col-span-2">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold">Métricas Avançadas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-slate-900">{Math.round(data.totalRecords / 7)}</div>
                            <div className="text-sm text-slate-600">Média por Dia</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-slate-900">
                              {Math.round(executiveKPIs.completionRate.value / 10)}x
                            </div>
                            <div className="text-sm text-slate-600">Velocidade</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-slate-900">
                              {Object.keys(data.statusCounts).length}
                            </div>
                            <div className="text-sm text-slate-600">Status Únicos</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-slate-900">
                              {Math.round(executiveKPIs.performance.value)}%
                            </div>
                            <div className="text-sm text-slate-600">Eficiência</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-900">{data.statusCounts["Erro"] || 0}</div>
                            <div className="text-sm text-slate-600">Erros</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-900">
                              {(data.statusCounts["Sem retorno"] || 0) + (data.statusCounts["Sem Retorno"] || 0)}
                            </div>
                            <div className="text-sm text-slate-600">Sem Retorno</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
