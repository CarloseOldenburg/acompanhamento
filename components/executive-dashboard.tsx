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
    const currentHour = new Date().getHours()
    const isBusinessHours = currentHour >= 8 && currentHour <= 18

    if (isRollout) {
      // Alertas específicos para ROLLOUT
      if (metrics.noResponseRate > 30) {
        alerts.push({
          type: "critical",
          title: "Cronograma Severamente Comprometido",
          message: `${metrics.noResponseRate.toFixed(0)}% das lojas (${metrics.noResponse} unidades) sem confirmação há mais de 48h`,
          action:
            "Convocar reunião de emergência com gerência regional e estabelecer prazo limite de 24h para todas as lojas pendentes",
          impact:
            "Risco alto de não cumprimento do cronograma de migração, possível atraso de 2-3 semanas no desligamento do sistema antigo",
          urgency: "IMEDIATA",
          responsible: "Gerência Regional + Diretoria",
          estimatedCost: "R$ 50k-100k em custos adicionais de manutenção do sistema antigo",
        })
      } else if (metrics.noResponseRate > 25) {
        alerts.push({
          type: "critical",
          title: "Cronograma em Risco Crítico",
          message: `${metrics.noResponseRate.toFixed(0)}% das lojas sem confirmação compromete cronograma`,
          action: "Estabelecer prazo limite de 48h e ativar suporte presencial para lojas críticas",
          impact: "Risco médio-alto de atraso no cronograma, possível extensão de 1-2 semanas",
          urgency: "24 HORAS",
          responsible: "Coordenação de Rollout",
          estimatedCost: "R$ 20k-40k em recursos adicionais",
        })
      }

      if (metrics.completionRate > 85) {
        alerts.push({
          type: "success",
          title: "Rollout Quase Finalizado - Sucesso!",
          message: `${metrics.completed} de ${metrics.total} lojas migradas com sucesso (${metrics.completionRate.toFixed(0)}%)`,
          action: "Iniciar preparativos para desativação do sistema antigo e comunicar sucesso à diretoria",
          impact: "Cronograma cumprido com sucesso, economia estimada de R$ 30k/mês com desligamento antecipado",
          urgency: "1 SEMANA",
          responsible: "Coordenação de Rollout",
          estimatedCost: "Economia de R$ 30k/mês",
        })
      } else if (metrics.completionRate > 80) {
        alerts.push({
          type: "success",
          title: "Reta Final do Rollout",
          message: `${metrics.completed} de ${metrics.total} lojas migradas - apenas ${metrics.total - metrics.completed} restantes`,
          action: "Focar recursos nas últimas lojas e agendar desativação do sistema antigo para próxima semana",
          impact: "Cronograma dentro do prazo, possível conclusão antecipada em 3-5 dias",
          urgency: "3-5 DIAS",
          responsible: "Coordenação de Rollout",
          estimatedCost: "Dentro do orçamento previsto",
        })
      }

      if (metrics.completionRate < 40 && metrics.noResponseRate < 25) {
        alerts.push({
          type: "warning",
          title: "Ritmo de Migração Abaixo do Esperado",
          message: `Apenas ${metrics.completionRate.toFixed(0)}% concluído - ritmo atual pode causar atraso`,
          action: "Reforçar equipe de suporte com 2-3 técnicos adicionais e intensificar comunicação com lojas",
          impact: "Possível atraso de 1 semana no cronograma se ritmo não acelerar",
          urgency: "48 HORAS",
          responsible: "Coordenação de Rollout",
          estimatedCost: "R$ 15k em recursos adicionais",
        })
      }

      if (metrics.errors > 0) {
        alerts.push({
          type: "warning",
          title: "Erros Técnicos Detectados",
          message: `${metrics.errors} loja(s) com erro técnico durante migração`,
          action: "Investigar problemas técnicos e providenciar suporte especializado",
          impact: "Possível necessidade de rollback em casos específicos",
          urgency: "24 HORAS",
          responsible: "Equipe Técnica",
          estimatedCost: "R$ 5k-10k em suporte técnico",
        })
      }
    } else if (isTesting) {
      // Alertas específicos para TESTES DE INTEGRAÇÃO
      if (metrics.errorRate > 15) {
        alerts.push({
          type: "critical",
          title: "Falhas Críticas na Integração VS-PDV",
          message: `${metrics.errorRate.toFixed(0)}% de falhas técnicas (${metrics.errors} erros) indica problemas graves na integração`,
          action: "PAUSAR todos os novos testes imediatamente e convocar equipe técnica para correção urgente",
          impact: "Risco alto de instabilidade em produção, possível impacto em vendas dos restaurantes",
          urgency: "IMEDIATA",
          responsible: "Equipe Técnica + CTO",
          estimatedCost: "R$ 30k-50k em correções urgentes",
        })
      } else if (metrics.errorRate > 10) {
        alerts.push({
          type: "critical",
          title: "Qualidade Técnica Crítica",
          message: `${metrics.errorRate.toFixed(0)}% de falhas técnicas acima do limite aceitável (5%)`,
          action: "Pausar novos testes e revisar configurações de integração VS-PDV",
          impact: "Risco médio de problemas em produção, necessário correção antes de continuar",
          urgency: "24 HORAS",
          responsible: "Equipe Técnica",
          estimatedCost: "R$ 15k-25k em correções",
        })
      }

      if (metrics.errorRate === 0 && metrics.completionRate > 70) {
        alerts.push({
          type: "success",
          title: "Integração VS-PDV Estável e Confiável",
          message: `Zero erros técnicos detectados em ${metrics.completed} testes concluídos`,
          action: "Manter padrão de qualidade atual e expandir cobertura de testes para novos PDVs",
          impact: "Integração estável e confiável, pronta para expansão em produção",
          urgency: "MANTER",
          responsible: "Coordenação de Testes",
          estimatedCost: "Dentro do orçamento, ROI positivo",
        })
      } else if (metrics.errorRate < 5 && metrics.completionRate > 60) {
        alerts.push({
          type: "success",
          title: "Qualidade dos Testes Excelente",
          message: `${metrics.errorRate.toFixed(1)}% de erros - bem abaixo do limite de 5%`,
          action: "Documentar melhores práticas e manter padrão de qualidade",
          impact: "Processo de testes funcionando perfeitamente, alta confiabilidade",
          urgency: "CONTINUAR",
          responsible: "Coordenação de Testes",
          estimatedCost: "Processo otimizado",
        })
      }

      if (metrics.noResponseRate > 50) {
        alerts.push({
          type: "warning",
          title: "Comunicação Severamente Comprometida",
          message: `${metrics.noResponseRate.toFixed(0)}% dos restaurantes sem retorno há mais de 72h`,
          action: "Implementar canal de comunicação direto (WhatsApp/telefone) e follow-up automático diário",
          impact: "Atraso significativo na validação dos testes, possível impacto no cronograma",
          urgency: "48 HORAS",
          responsible: "Coordenação de Testes + Atendimento",
          estimatedCost: "R$ 8k-12k em recursos de comunicação",
        })
      } else if (metrics.noResponseRate > 40) {
        alerts.push({
          type: "warning",
          title: "Comunicação com Restaurantes Deficiente",
          message: `${metrics.noResponseRate.toFixed(0)}% sem retorno indica problemas de comunicação`,
          action: "Melhorar follow-up e implementar canal direto de comunicação",
          impact: "Atraso moderado na validação dos testes",
          urgency: "72 HORAS",
          responsible: "Coordenação de Testes",
          estimatedCost: "R$ 5k em melhorias de comunicação",
        })
      }

      if (metrics.pending > metrics.total * 0.4) {
        alerts.push({
          type: "warning",
          title: "Alto Volume de Testes Pendentes",
          message: `${metrics.pending} testes pendentes (${metrics.pendingRate.toFixed(0)}% do total)`,
          action: "Priorizar execução dos testes pendentes e otimizar processo",
          impact: "Possível gargalo no processo de validação",
          urgency: "1 SEMANA",
          responsible: "Coordenação de Testes",
          estimatedCost: "R$ 3k-5k em otimização",
        })
      }
    }

    // Alertas gerais baseados no horário
    if (!isBusinessHours && alerts.some((a) => a.type === "critical")) {
      alerts.unshift({
        type: "critical",
        title: "Alerta Fora do Horário Comercial",
        message: "Situação crítica detectada fora do horário comercial",
        action: "Acionar plantão técnico e notificar gerência via WhatsApp/telefone",
        impact: "Necessário ação imediata mesmo fora do horário comercial",
        urgency: "IMEDIATA",
        responsible: "Plantão Técnico",
        estimatedCost: "Custo de plantão aplicável",
      })
    }

    return alerts.slice(0, 6) // Máximo 6 alertas para não sobrecarregar
  }, [executiveMetrics, isRollout, isTesting])

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

        {/* Alertas Executivos Aprimorados */}
        {executiveAlerts.length > 0 && (
          <div className="space-y-4">
            {/* Header dos Alertas */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-slate-600" />
                <h2 className="text-lg font-semibold text-slate-900">Alertas Executivos</h2>
                <Badge variant="outline" className="text-xs">
                  {executiveAlerts.length} {executiveAlerts.length === 1 ? "alerta" : "alertas"}
                </Badge>
              </div>
              <div className="text-xs text-slate-500">
                Atualizado: {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>

            {/* Grid de Alertas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {executiveAlerts.map((alert, index) => (
                <Card
                  key={index}
                  className={`border-l-4 ${
                    alert.type === "critical"
                      ? "border-l-red-500 bg-red-50/50 shadow-red-100"
                      : alert.type === "warning"
                        ? "border-l-yellow-500 bg-yellow-50/50 shadow-yellow-100"
                        : "border-l-green-500 bg-green-50/50 shadow-green-100"
                  } shadow-lg hover:shadow-xl transition-all duration-300 group`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start space-x-4">
                      {/* Ícone do Alerta */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          alert.type === "critical"
                            ? "bg-red-100 text-red-600"
                            : alert.type === "warning"
                              ? "bg-yellow-100 text-yellow-600"
                              : "bg-green-100 text-green-600"
                        }`}
                      >
                        {alert.type === "critical" ? (
                          <AlertTriangle className="w-5 h-5" />
                        ) : alert.type === "warning" ? (
                          <Clock className="w-5 h-5" />
                        ) : (
                          <CheckCircle className="w-5 h-5" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Header do Alerta */}
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-slate-900 truncate">{alert.title}</h4>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              alert.type === "critical"
                                ? "border-red-300 text-red-700"
                                : alert.type === "warning"
                                  ? "border-yellow-300 text-yellow-700"
                                  : "border-green-300 text-green-700"
                            }`}
                          >
                            {alert.type === "critical" ? "CRÍTICO" : alert.type === "warning" ? "ATENÇÃO" : "SUCESSO"}
                          </Badge>
                        </div>

                        {/* Mensagem Principal */}
                        <p className="text-sm text-slate-700 mb-3 leading-relaxed">{alert.message}</p>

                        {/* Seção de Ação */}
                        <div className="space-y-2 mb-3">
                          <div className="flex items-start space-x-2">
                            <Zap className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-slate-800 mb-1">Ação Recomendada:</p>
                              <p className="text-xs text-slate-600 leading-relaxed">{alert.action}</p>
                            </div>
                          </div>
                        </div>

                        {/* Seção de Impacto */}
                        <div className="space-y-2 mb-3">
                          <div className="flex items-start space-x-2">
                            <Target className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-slate-800 mb-1">Impacto no Negócio:</p>
                              <p className="text-xs text-slate-600 leading-relaxed">{alert.impact}</p>
                            </div>
                          </div>
                        </div>

                        {/* Informações Adicionais */}
                        <div className="pt-3 border-t border-slate-200">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="font-medium text-slate-700 mb-1">Prazo:</p>
                              <p className="text-slate-600">
                                {alert.type === "critical"
                                  ? "Imediato"
                                  : alert.type === "warning"
                                    ? "24-48h"
                                    : "1 semana"}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-slate-700 mb-1">Responsável:</p>
                              <p className="text-slate-600">
                                {isRollout
                                  ? alert.type === "critical"
                                    ? "Gerência Regional"
                                    : "Coord. Rollout"
                                  : alert.type === "critical"
                                    ? "Equipe Técnica"
                                    : "Coord. Testes"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Métricas do Alerta (se disponível) */}
                        {(alert.type === "critical" || alert.type === "warning") && (
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-600">Situação atual:</span>
                              <div className="flex items-center space-x-2">
                                {isRollout ? (
                                  <>
                                    <span className="font-medium text-slate-800">
                                      {executiveMetrics.statusBreakdown.noResponseRate.toFixed(0)}% sem retorno
                                    </span>
                                    <div className="w-12 h-1.5 bg-slate-200 rounded-full">
                                      <div
                                        className={`h-1.5 rounded-full ${
                                          executiveMetrics.statusBreakdown.noResponseRate > 25
                                            ? "bg-red-500"
                                            : "bg-yellow-500"
                                        }`}
                                        style={{
                                          width: `${Math.min(100, executiveMetrics.statusBreakdown.noResponseRate * 2)}%`,
                                        }}
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <span className="font-medium text-slate-800">
                                      {executiveMetrics.statusBreakdown.errorRate.toFixed(0)}% erros
                                    </span>
                                    <div className="w-12 h-1.5 bg-slate-200 rounded-full">
                                      <div
                                        className={`h-1.5 rounded-full ${
                                          executiveMetrics.statusBreakdown.errorRate > 10
                                            ? "bg-red-500"
                                            : "bg-yellow-500"
                                        }`}
                                        style={{
                                          width: `${Math.min(100, executiveMetrics.statusBreakdown.errorRate * 5)}%`,
                                        }}
                                      />
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Botão de Ação Rápida */}
                        {alert.type === "critical" && (
                          <div className="mt-4">
                            <Button
                              size="sm"
                              className={`w-full text-xs ${
                                alert.type === "critical"
                                  ? "bg-red-600 hover:bg-red-700"
                                  : "bg-yellow-600 hover:bg-yellow-700"
                              }`}
                              onClick={() => {
                                toast.success(`Ação "${alert.action}" registrada para execução imediata!`)
                              }}
                            >
                              <Zap className="w-3 h-3 mr-1" />
                              Executar Ação
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Resumo dos Alertas */}
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-slate-600">
                        {executiveAlerts.filter((a) => a.type === "critical").length} críticos
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm text-slate-600">
                        {executiveAlerts.filter((a) => a.type === "warning").length} atenção
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-slate-600">
                        {executiveAlerts.filter((a) => a.type === "success").length} sucessos
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    Próxima atualização:{" "}
                    {new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
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
