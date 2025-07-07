"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  LineChart,
  Line,
} from "recharts"
import {
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Target,
  Activity,
  ArrowLeft,
  Share2,
  Download,
  Settings,
} from "lucide-react"

interface EnhancedDashboardProps {
  data: {
    tabName: string
    totalRecords: number
    statusCounts: Record<string, number>
    recentActivity: Array<any>
    dashboardType?: string
  }
  onBack?: () => void
}

export function EnhancedDashboard({ data, onBack }: EnhancedDashboardProps) {
  // Verificar se os dados existem e têm as propriedades necessárias
  const safeData = useMemo(() => {
    return {
      tabName: data?.tabName || "Dashboard",
      totalRecords: data?.totalRecords || 0,
      statusCounts: data?.statusCounts || {},
      recentActivity: data?.recentActivity || [],
      dashboardType: data?.dashboardType || "rollout",
    }
  }, [data])

  // Cálculos de métricas com verificação de segurança
  const metrics = useMemo(() => {
    const statusEntries = Object.entries(safeData.statusCounts)
    const total = safeData.totalRecords

    if (total === 0 || statusEntries.length === 0) {
      return {
        totalItems: 0,
        completedItems: 0,
        inProgressItems: 0,
        pendingItems: 0,
        scheduledItems: 0,
        completionRate: 0,
        statusDistribution: [],
        recentActivityCount: 0,
      }
    }

    // Análise de status
    const statusCounts = statusEntries.reduce(
      (acc, [status, count]) => {
        const statusLower = status.toLowerCase()
        if (statusLower.includes("conclu") || statusLower.includes("complete") || statusLower.includes("aprovado")) {
          acc.completed += count
        } else if (
          statusLower.includes("andamento") ||
          statusLower.includes("progress") ||
          statusLower.includes("executando")
        ) {
          acc.inProgress += count
        } else if (statusLower.includes("pendent") || statusLower.includes("aguard")) {
          acc.pending += count
        } else if (statusLower.includes("agendado") || statusLower.includes("scheduled")) {
          acc.scheduled += count
        } else {
          acc.other += count
        }
        return acc
      },
      { completed: 0, inProgress: 0, pending: 0, scheduled: 0, other: 0 },
    )

    const completionRate = total > 0 ? Math.round((statusCounts.completed / total) * 100) : 0

    // Status distribution para gráfico de pizza
    const statusDistribution = [
      { name: "Concluído", value: statusCounts.completed, color: "#10B981" },
      { name: "Em Andamento", value: statusCounts.inProgress, color: "#3B82F6" },
      { name: "Pendente", value: statusCounts.pending, color: "#F59E0B" },
      { name: "Agendado", value: statusCounts.scheduled, color: "#8B5CF6" },
      { name: "Outros", value: statusCounts.other, color: "#6B7280" },
    ].filter((item) => item.value > 0)

    return {
      totalItems: total,
      completedItems: statusCounts.completed,
      inProgressItems: statusCounts.inProgress,
      pendingItems: statusCounts.pending,
      scheduledItems: statusCounts.scheduled,
      completionRate,
      statusDistribution,
      recentActivityCount: safeData.recentActivity.length,
    }
  }, [safeData])

  // Dados para gráfico de barras
  const chartData = useMemo(() => {
    return Object.entries(safeData.statusCounts).map(([status, count]) => ({
      name: status.length > 15 ? status.substring(0, 15) + "..." : status,
      fullName: status,
      value: count,
      percentage: safeData.totalRecords > 0 ? Math.round((count / safeData.totalRecords) * 100) : 0,
    }))
  }, [safeData.statusCounts, safeData.totalRecords])

  // Dados de tendência (simulados)
  const trendData = useMemo(() => {
    const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
    return days.map((day, index) => ({
      day,
      completed: Math.floor(Math.random() * 20) + 5,
      created: Math.floor(Math.random() * 15) + 3,
    }))
  }, [])

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower.includes("conclu") || statusLower.includes("complete")) {
      return <CheckCircle className="h-4 w-4 text-green-600" />
    } else if (statusLower.includes("andamento") || statusLower.includes("progress")) {
      return <Clock className="h-4 w-4 text-blue-600" />
    } else if (statusLower.includes("pendent")) {
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    } else if (statusLower.includes("agendado")) {
      return <Calendar className="h-4 w-4 text-purple-600" />
    }
    return <Target className="h-4 w-4 text-gray-600" />
  }

  const handleExport = () => {
    try {
      const exportData = safeData.recentActivity.map((item, index) => ({
        ID: index + 1,
        Status: item.status || "N/A",
        Data: item.data || new Date().toISOString().split("T")[0],
        Observacao: item.observacao || "",
      }))

      const headers = Object.keys(exportData[0] || {})
      const csvContent = [
        headers.join(","),
        ...exportData.map((row) =>
          headers
            .map((header) => `"${(row[header as keyof typeof row] || "").toString().replace(/"/g, '""')}"`)
            .join(","),
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `${safeData.tabName}_${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Export error:", error)
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Dashboard - ${safeData.tabName}`,
        text: `Confira o dashboard de ${safeData.tabName}`,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert("Link copiado para a área de transferência!")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header com botões de navegação */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {onBack && (
                <Button variant="outline" onClick={onBack} size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard - {safeData.tabName}</h1>
                <p className="text-gray-600">
                  Tipo: {safeData.dashboardType === "rollout" ? "Rollout de Migração" : "Testes de Integração"}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => (window.location.href = "/admin")}>
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Cards de Métricas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total de Registros</p>
                    <p className="text-3xl font-bold">{metrics.totalItems}</p>
                    <p className="text-blue-200 text-xs mt-1">
                      {safeData.dashboardType === "rollout" ? "lojas" : "testes"}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Taxa de Conclusão</p>
                    <p className="text-3xl font-bold">{metrics.completionRate}%</p>
                    <div className="mt-2">
                      <div className="w-full bg-green-400/30 rounded-full h-2">
                        <div
                          className="bg-white h-2 rounded-full transition-all duration-500"
                          style={{ width: `${metrics.completionRate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Concluídos</p>
                    <p className="text-3xl font-bold">{metrics.completedItems}</p>
                    <p className="text-purple-200 text-xs mt-1">de {metrics.totalItems} registros</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Em Andamento</p>
                    <p className="text-3xl font-bold">{metrics.inProgressItems}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Clock className="w-3 h-3 text-orange-200" />
                      <p className="text-orange-200 text-xs">ativos</p>
                    </div>
                  </div>
                  <Activity className="h-8 w-8 text-orange-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Gráfico de Barras */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart className="h-5 w-5 mr-2" />
                  Distribuição por Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip
                        formatter={(value, name) => [value, "Quantidade"]}
                        labelFormatter={(label) => {
                          const item = chartData.find((d) => d.name === label)
                          return item?.fullName || label
                        }}
                      />
                      <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de Pizza */}
            <Card>
              <CardHeader>
                <CardTitle>Proporção de Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {metrics.statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Tendência */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Tendência Semanal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2} name="Concluídos" />
                    <Line type="monotone" dataKey="created" stroke="#3B82F6" strokeWidth={2} name="Criados" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Resumo Executivo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Resumo Executivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Indicadores Principais</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total de Registros:</span>
                      <span className="font-semibold">{metrics.totalItems}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Taxa de Conclusão:</span>
                      <span className="font-semibold text-green-600">{metrics.completionRate}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Concluídos:</span>
                      <span className="font-semibold text-blue-600">{metrics.completedItems}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Em Andamento:</span>
                      <span className="font-semibold text-orange-600">{metrics.inProgressItems}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Status do Projeto</h4>
                  <div className="space-y-3">
                    {metrics.completionRate >= 80 && (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">Projeto em excelente andamento</span>
                      </div>
                    )}
                    {metrics.completionRate >= 50 && metrics.completionRate < 80 && (
                      <div className="flex items-center space-x-2 text-orange-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">Projeto em bom andamento</span>
                      </div>
                    )}
                    {metrics.completionRate < 50 && (
                      <div className="flex items-center space-x-2 text-red-600">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm">Projeto necessita atenção</span>
                      </div>
                    )}
                    <p className="text-sm text-gray-600">
                      Tipo: {safeData.dashboardType === "rollout" ? "Rollout de Migração" : "Testes de Integração"}
                    </p>
                    <p className="text-sm text-gray-600">Última atualização: {new Date().toLocaleString("pt-BR")}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
