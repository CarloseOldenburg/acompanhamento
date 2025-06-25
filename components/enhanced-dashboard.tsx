"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import {
  ArrowLeft,
  Download,
  TrendingUp,
  Clock,
  CheckCircle,
  Store,
  TestTube,
  Zap,
  AlertCircle,
  XCircle,
} from "lucide-react"
import type { DashboardData } from "../types"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { AIInsightsPanel } from "./ai-insights-panel"

interface EnhancedDashboardProps {
  data: DashboardData
  onBack: () => void
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

export function EnhancedDashboard({ data, onBack }: EnhancedDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("todos")

  // Determinar tipo de dashboard baseado na aba
  const dashboardType = data.dashboardType || "rollout"

  const chartData = useMemo(
    () =>
      Object.entries(data.statusCounts).map(([status, count]) => ({
        status,
        count,
      })),
    [data.statusCounts],
  )

  const pieData = useMemo(
    () =>
      Object.entries(data.statusCounts).map(([status, count], index) => {
        // Definir cor específica baseada no status
        let statusColor = COLORS[index % COLORS.length] // fallback

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
          name: status,
          value: count,
          color: statusColor,
        }
      }),
    [data.statusCounts],
  )

  // Estatísticas para Rollout
  const rolloutStats = useMemo(() => {
    if (dashboardType !== "rollout") return { stores: [], statusGroups: {} }

    console.log("=== CALCULANDO ESTATÍSTICAS DO ROLLOUT ===")
    const storeArray: any[] = []

    data.recentActivity.forEach((row, index) => {
      const storeName = row.loja || row.restaurante || row.cliente || row.nome || row.unidade || `Loja ${index + 1}`
      const status = row.status || "Sem Status"

      storeArray.push({
        name: storeName,
        status: status,
        originalIndex: index,
        fullData: row,
      })
    })

    const statusGroups = storeArray.reduce(
      (acc, store) => {
        if (!acc[store.status]) {
          acc[store.status] = []
        }
        acc[store.status].push(store)
        return acc
      },
      {} as { [key: string]: any[] },
    )

    console.log("Lojas processadas:", storeArray.length)
    console.log("Status groups:", Object.keys(statusGroups))
    console.log("=== FIM DO CÁLCULO ROLLOUT ===")
    return { stores: storeArray, statusGroups }
  }, [data.recentActivity, dashboardType])

  // Estatísticas para Testes de Integração - CORRIGIDO
  const testingStats = useMemo(() => {
    if (dashboardType !== "testing") return { tests: [], statusGroups: {} }

    console.log("=== CALCULANDO ESTATÍSTICAS DE TESTES ===")
    const testArray: any[] = []

    data.recentActivity.forEach((row, index) => {
      // Buscar nome real do PDV/teste com prioridade
      const testName =
        row.nome_do_restaurante || // Nome do restaurante tem prioridade
        row.pdv_integradora || // Depois PDV/Integradora
        row.terminal ||
        row.equipamento ||
        row.nome_pdv ||
        row.nome_teste ||
        row.teste ||
        row.loja ||
        `Teste ${index + 1}`

      const status = row.status || "Sem Status"
      const testType = row.tipo_teste || row.categoria || row.tipo || "PDV"

      testArray.push({
        name: testName,
        status: status,
        type: testType,
        originalIndex: index,
        fullData: row,
      })
    })

    const statusGroups = testArray.reduce(
      (acc, test) => {
        if (!acc[test.status]) {
          acc[test.status] = []
        }
        acc[test.status].push(test)
        return acc
      },
      {} as { [key: string]: any[] },
    )

    console.log("Testes processados:", testArray.length)
    console.log("Status groups:", Object.keys(statusGroups))
    console.log("=== FIM DO CÁLCULO TESTES ===")
    return { tests: testArray, statusGroups }
  }, [data.recentActivity, dashboardType])

  // Calcular progresso baseado no tipo - CORRIGIDO PARA TRATAR "SEM RETORNO" CORRETAMENTE
  const progress = useMemo(() => {
    const isRollout = dashboardType === "rollout"
    const items = isRollout ? rolloutStats.stores : testingStats.tests
    const statusGroups = isRollout ? rolloutStats.statusGroups : testingStats.statusGroups

    console.log("=== CALCULANDO PROGRESSO ===")
    console.log("Status disponíveis:", Object.keys(statusGroups))
    console.log("Status counts do data:", data.statusCounts)

    const total = items.length

    // Concluídos (sucesso)
    const completed =
      (statusGroups["Concluído"]?.length || 0) +
      (statusGroups["Concluido"]?.length || 0) +
      (statusGroups["Aprovado"]?.length || 0) +
      (statusGroups["Passou"]?.length || 0)

    // Em andamento/progresso
    const inProgress =
      (statusGroups["Em Andamento"]?.length || 0) +
      (statusGroups["Executando"]?.length || 0) +
      (statusGroups["Testando"]?.length || 0) +
      (statusGroups["Agendado"]?.length || 0)

    // Pendentes (incluindo sem retorno - pois precisam de ação)
    const pending =
      (statusGroups["Pendente"]?.length || 0) +
      (statusGroups["Aguardando"]?.length || 0) +
      (statusGroups["Não Testado"]?.length || 0)

    // Sem retorno (categoria especial - não é erro, mas precisa de acompanhamento)
    const noResponse = (statusGroups["Sem retorno"]?.length || 0) + (statusGroups["Sem Retorno"]?.length || 0)

    // Falhas/erros (problemas reais)
    const failed =
      (statusGroups["Falhou"]?.length || 0) +
      (statusGroups["Reprovado"]?.length || 0) +
      (statusGroups["Erro"]?.length || 0)

    const successPercentage = total > 0 ? Math.round((completed / total) * 100) : 0
    const remainingPercentage = 100 - successPercentage

    console.log("Métricas calculadas:")
    console.log("- Total:", total)
    console.log("- Concluídos:", completed)
    console.log("- Em progresso:", inProgress)
    console.log("- Pendentes:", pending)
    console.log("- Sem retorno:", noResponse)
    console.log("- Falhas:", failed)
    console.log("- Taxa de sucesso:", successPercentage + "%")
    console.log("=== FIM CÁLCULO PROGRESSO ===")

    return {
      total,
      completed,
      inProgress,
      pending,
      noResponse, // Separado dos pendentes para melhor visibilidade
      failed,
      successPercentage,
      remainingPercentage,
    }
  }, [rolloutStats, testingStats, dashboardType, data.statusCounts])

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "concluído":
      case "concluido":
      case "aprovado":
      case "passou":
        return "text-green-600 bg-green-100"
      case "pendente":
      case "aguardando":
      case "não testado":
        return "text-yellow-600 bg-yellow-100"
      case "agendado":
      case "executando":
      case "testando":
        return "text-blue-600 bg-blue-100"
      case "em andamento":
        return "text-purple-600 bg-purple-100"
      case "erro":
        return "text-red-700 bg-red-100 border-red-300"
      case "sem retorno":
        return "text-purple-700 bg-purple-100 border-purple-300"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

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
        return <Zap className="w-4 h-4" />
      case "erro":
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case "sem retorno":
        return <XCircle className="w-4 h-4 text-purple-600" />
      default:
        return <TrendingUp className="w-4 h-4" />
    }
  }

  const handleExport = () => {
    try {
      const isRollout = dashboardType === "rollout"
      const exportData = data.recentActivity.map((row) => {
        if (isRollout) {
          return {
            Loja: row.loja || row.restaurante || row.cliente || "",
            Status: row.status || "",
            "Sistema Atual": row.status === "Concluído" || row.status === "Concluido" ? "Novo" : "Antigo",
            Observação: row.observacao || "",
            "Data de Atualização": row.dataAgendamento || row.data || "",
          }
        } else {
          return {
            PDV: row.pdv || row.terminal || row.equipamento || row.nome_pdv || row.loja || "",
            Status: row.status || "",
            Tipo: row.tipo_teste || row.categoria || row.tipo || "PDV",
            Resultado: row.resultado || "",
            Observação: row.observacao || "",
            "Data do Teste": row.dataAgendamento || row.data || "",
          }
        }
      })

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
      link.setAttribute(
        "download",
        `${isRollout ? "rollout" : "testes"}_${data.tabName}_${new Date().toISOString().split("T")[0]}.csv`,
      )
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`Dados ${isRollout ? "do rollout" : "dos testes"} exportados com sucesso!`)
    } catch (error) {
      toast.error("Erro ao exportar dados")
      console.error("Export error:", error)
    }
  }

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value)
    toast.info(`Filtro alterado para: ${value === "todos" ? "Todos os períodos" : value}`)
  }

  const isRollout = dashboardType === "rollout"
  const currentItems = isRollout ? rolloutStats.stores : testingStats.tests

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={onBack} className="shadow-sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{data.tabName}</h1>
              <p className="text-gray-600">Dashboard em tempo real</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-48 shadow-sm">
                <SelectValue placeholder="Filtrar por período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os períodos</SelectItem>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="semana">Esta semana</SelectItem>
                <SelectItem value="mes">Este mês</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport} variant="outline" className="shadow-sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-lg border-0 bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">
                    {isRollout ? "Total de Lojas" : "Total de Testes"}
                  </p>
                  <p className="text-3xl font-bold">{currentItems.length}</p>
                  {!isRollout && <p className="text-green-200 text-xs mt-1">Testes contínuos</p>}
                </div>
                <div className="w-12 h-12 bg-green-400/30 rounded-lg flex items-center justify-center">
                  {isRollout ? <Store className="w-6 h-6" /> : <TestTube className="w-6 h-6" />}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">
                    {isRollout ? "Progresso do Rollout" : "Taxa de Sucesso"}
                  </p>
                  <p className="text-3xl font-bold">{progress.successPercentage}%</p>
                  <p className="text-purple-200 text-xs mt-1">
                    {isRollout
                      ? `${progress.completed} de ${progress.total} lojas`
                      : `${progress.remainingPercentage}% restante para 100%`}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-400/30 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {Object.entries(data.statusCounts)
            .slice(0, 1)
            .map(([status, count], index) => (
              <Card key={status} className="shadow-lg border-0 bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">{status}</p>
                      <p className="text-2xl font-bold text-gray-900">{count}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {((count / data.totalRecords) * 100).toFixed(1)}% do total
                      </p>
                    </div>
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getStatusColor(status)}`}>
                      {getStatusIcon(status)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>

        {/* AI Insights Panel */}
        <AIInsightsPanel data={data} />

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-900">Distribuição por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-900">Proporção por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Overview Section */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">
              {isRollout
                ? `Progresso do Rollout (${currentItems.length} lojas)`
                : `Resultados dos Testes (${currentItems.length} testes)`}
            </CardTitle>
            <div className="flex items-center space-x-4 text-sm text-gray-600 flex-wrap">
              <span className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>
                  {progress.completed} {isRollout ? "Concluídas" : "Aprovados"}
                </span>
              </span>
              <span className="flex items-center space-x-1">
                <Zap className="w-4 h-4 text-blue-600" />
                <span>
                  {progress.inProgress} {isRollout ? "Em Andamento" : "Executando"}
                </span>
              </span>
              <span className="flex items-center space-x-1">
                <Clock className="w-4 h-4 text-yellow-600" />
                <span>
                  {progress.pending} {isRollout ? "Pendentes" : "Aguardando"}
                </span>
              </span>
              {progress.noResponse > 0 && (
                <span className="flex items-center space-x-1">
                  <XCircle className="w-4 h-4 text-purple-600" />
                  <span>{progress.noResponse} Sem Retorno</span>
                </span>
              )}
              {progress.failed > 0 && (
                <span className="flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>{progress.failed} Falharam</span>
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Barra de Progresso */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>{isRollout ? "Progresso Geral" : "Taxa de Sucesso"}</span>
                <span>{progress.successPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progress.successPercentage}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-2 space-y-1">
                <div>
                  ✅ {progress.completed} concluídos • 🔄 {progress.inProgress} em progresso
                </div>
                <div>
                  ⏳ {progress.pending} pendentes • 🟣 {progress.noResponse} sem retorno • ❌ {progress.failed} falhas
                </div>
              </div>
            </div>

            {/* Lista de Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-slate-900">
                  {isRollout ? "Lojas no Rollout" : "Testes de Integração"}
                </h4>
                <div className="text-sm text-slate-600">
                  Mostrando {Math.min(currentItems.length, 12)} de {currentItems.length}{" "}
                  {isRollout ? "lojas" : "testes"}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentItems.slice(0, 12).map((item, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50/50 rounded-lg hover:bg-gray-100/50 transition-colors border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 truncate flex-1 mr-2" title={item.name}>
                        {item.name}
                      </h4>
                      <div
                        className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(item.status)}`}
                      >
                        {getStatusIcon(item.status)}
                        <span>{item.status}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      {isRollout ? (
                        <>
                          <div>
                            Sistema: {item.status === "Concluído" || item.status === "Concluido" ? "Novo" : "Antigo"}
                          </div>
                          {item.fullData?.data_de_agendamento && (
                            <div>Agendado: {item.fullData.data_de_agendamento}</div>
                          )}
                        </>
                      ) : (
                        <>
                          <div>PDV: {item.fullData?.pdv_integradora || "N/A"}</div>
                          <div>Solicitante: {item.fullData?.solicitante || "N/A"}</div>
                          {item.fullData?.carimbo_de_data_hora && <div>Data: {item.fullData.carimbo_de_data_hora}</div>}
                        </>
                      )}
                    </div>
                    {item.fullData?.observacao && (
                      <div className="mt-2 text-xs text-gray-600 line-clamp-2">
                        {item.fullData.observacao.length > 100
                          ? `${item.fullData.observacao.substring(0, 100)}...`
                          : item.fullData.observacao}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {currentItems.length > 12 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">
                    Mostrando 12 de {currentItems.length} {isRollout ? "lojas" : "testes"}. Use a exportação para ver
                    todos os dados.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => {
                      // Expandir para mostrar mais itens
                      toast.info("Use a exportação para ver todos os dados detalhados")
                    }}
                  >
                    Ver Mais Detalhes na Exportação
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
