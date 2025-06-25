"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import {
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle,
  Share2,
  Download,
  Store,
  TestTube,
  Zap,
  AlertCircle,
} from "lucide-react"
import { LoadingSpinner } from "../../../components/loading-spinner"
import { Footer } from "../../../components/footer"
import { getTabsAction } from "../../actions"
import { useParams } from "next/navigation"
import { toast } from "sonner"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

export default function SharedDashboard() {
  const params = useParams()
  const tabId = params.tabId as string
  const [tabData, setTabData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [selectedPeriod, setSelectedPeriod] = useState("todos")
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      console.log("🔍 SharedDashboard - Buscando tab com ID:", tabId)

      const result = await getTabsAction()
      console.log("📊 SharedDashboard - Resultado completo:", result)

      if (result && result.success && result.tabs && Array.isArray(result.tabs)) {
        console.log(
          "📋 SharedDashboard - Tabs disponíveis:",
          result.tabs.map((t) => ({ id: t.id, name: t.name })),
        )

        // Busca mais robusta - tenta diferentes formas de encontrar a tab
        let tab = result.tabs.find((t) => t.id === tabId)

        if (!tab) {
          // Tenta buscar por ID convertido para string
          tab = result.tabs.find((t) => String(t.id) === String(tabId))
        }

        if (!tab) {
          // Tenta buscar por nome (caso o ID seja baseado no nome)
          const decodedTabId = decodeURIComponent(tabId)
          tab = result.tabs.find(
            (t) =>
              t.name.toLowerCase().replace(/\s+/g, "_") === decodedTabId.toLowerCase() ||
              t.name.toLowerCase().replace(/\s+/g, "-") === decodedTabId.toLowerCase(),
          )
        }

        if (!tab) {
          // Tenta buscar por parte do nome
          tab = result.tabs.find(
            (t) =>
              tabId.includes(t.name.toLowerCase().replace(/\s+/g, "_")) ||
              tabId.includes(t.name.toLowerCase().replace(/\s+/g, "-")) ||
              t.name.toLowerCase().includes(tabId.toLowerCase()),
          )
        }

        if (tab) {
          console.log("✅ SharedDashboard - Tab encontrada:", { id: tab.id, name: tab.name, type: tab.dashboardType })
          setTabData(tab)
          setLastUpdate(new Date())
          setDebugInfo(null)
        } else {
          console.log("❌ SharedDashboard - Tab não encontrada")
          setDebugInfo({
            searchedId: tabId,
            availableTabs: result.tabs.map((t) => ({ id: t.id, name: t.name })),
            totalTabs: result.tabs.length,
          })
        }
      } else {
        console.log("❌ SharedDashboard - Formato de resposta inválido:", result)
        setDebugInfo({
          error: "Formato de dados inválido",
          result,
          searchedId: tabId,
        })
      }
    } catch (error) {
      console.error("💥 SharedDashboard - Erro na busca:", error)
      setDebugInfo({
        error: "Erro de conexão",
        details: error.message,
        searchedId: tabId,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [tabId])

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success("Link copiado para a área de transferência!")
  }

  const handleExport = () => {
    try {
      const isRollout = (tabData.dashboardType || "rollout") === "rollout"
      const exportData = tabData.rows.map((row) => {
        if (isRollout) {
          return {
            "Carimbo de data/hora": row.timestamp || "",
            "Nome da Loja/Unidade": row.loja || row.restaurante || row.nome || row.unidade || "",
            "Telefone do Cliente": row.telefone || "",
            Solicitante: row.solicitante || "",
            "Merchant ID": row.merchantId || "",
            "Sistema/PDV": row.pdv || row.sistema || "",
            Observação: row.observacao || "",
            Status: row.status || "",
            "Data de Agendamento": row.dataAgendamento || "",
          }
        } else {
          return {
            "Carimbo de data/hora": row.timestamp || "",
            "Nome do PDV/Teste": row.pdv || row.terminal || row.equipamento || row.nome_teste || "",
            "Tipo de Teste": row.tipo_teste || row.categoria || row.tipo || "",
            Resultado: row.resultado || row.status || "",
            Observação: row.observacao || "",
            "Data do Teste": row.dataAgendamento || row.data || "",
            Responsável: row.responsavel || row.solicitante || "",
          }
        }
      })

      const headers = Object.keys(exportData[0] || {})
      const csvContent = [
        headers.join(","),
        ...exportData.map((row) =>
          headers.map((header) => `"${(row[header] || "").toString().replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute(
        "download",
        `${isRollout ? "rollout" : "testes"}_${tabData.name}_${new Date().toISOString().split("T")[0]}.csv`,
      )
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`Dados ${isRollout ? "do rollout" : "dos testes"} exportados com sucesso!`)
    } catch (error) {
      toast.error("Erro ao exportar dados")
    }
  }

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value)
    toast.info(`Filtro alterado para: ${value === "todos" ? "Todos os períodos" : value}`)
  }

  if (loading && !tabData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600">Carregando dashboard...</p>
          <p className="text-xs text-gray-400">ID: {tabId}</p>
        </div>
      </div>
    )
  }

  if (!tabData) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-2xl text-center">
            <CardContent className="p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Dashboard não encontrado</h2>
              <p className="text-gray-600 mb-6">O dashboard solicitado não existe ou foi removido.</p>

              {/* Debug Info */}
              {debugInfo && (
                <div className="bg-gray-50 p-4 rounded-lg text-left text-sm">
                  <h3 className="font-semibold mb-2">Informações de Debug:</h3>
                  <p>
                    <strong>ID Procurado:</strong> {debugInfo.searchedId || "N/A"}
                  </p>
                  {debugInfo.availableTabs && (
                    <div className="mt-2">
                      <strong>Dashboards Disponíveis ({debugInfo.totalTabs}):</strong>
                      <ul className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                        {debugInfo.availableTabs.map((tab, index) => (
                          <li key={index} className="text-xs">
                            • ID: <span className="font-mono">{tab.id}</span> | Nome: {tab.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {debugInfo.error && (
                    <p className="text-red-600 mt-2">
                      <strong>Erro:</strong> {debugInfo.error}
                    </p>
                  )}
                  {debugInfo.details && (
                    <p className="text-red-600 mt-1">
                      <strong>Detalhes:</strong> {debugInfo.details}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-6">
                <Button onClick={fetchData} disabled={loading} className="mr-3">
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                  Tentar Novamente
                </Button>
                <Button variant="outline" onClick={() => (window.location.href = "/")}>
                  Voltar ao Início
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    )
  }

  // Determinar tipo de dashboard
  const dashboardType = tabData.dashboardType || "rollout"
  const isRollout = dashboardType === "rollout"

  const statusCounts: { [key: string]: number } = {}
  tabData.rows.forEach((row: any) => {
    const status = row.status || "Sem Status"
    statusCounts[status] = (statusCounts[status] || 0) + 1
  })

  const chartData = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }))

  const pieData = Object.entries(statusCounts).map(([status, count], index) => ({
    name: status,
    value: count,
    color: COLORS[index % COLORS.length],
  }))

  // Calcular progresso baseado no tipo
  const progress = (() => {
    const total = tabData.rows.length
    const completed =
      statusCounts["Concluído"] || statusCounts["Concluido"] || statusCounts["Aprovado"] || statusCounts["Passou"] || 0
    const inProgress =
      statusCounts["Em Andamento"] ||
      statusCounts["Executando"] ||
      statusCounts["Testando"] ||
      statusCounts["Agendado"] ||
      0
    const pending = statusCounts["Pendente"] || statusCounts["Aguardando"] || statusCounts["Não Testado"] || 0
    const failed = statusCounts["Falhou"] || statusCounts["Reprovado"] || statusCounts["Erro"] || 0

    const successPercentage = total > 0 ? Math.round((completed / total) * 100) : 0

    return {
      total,
      completed,
      inProgress,
      pending,
      failed,
      successPercentage,
    }
  })()

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
      case "falhou":
      case "reprovado":
      case "erro":
        return "text-red-600 bg-red-100"
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
      case "testando":
        return <Zap className="w-4 h-4" />
      case "falhou":
      case "reprovado":
      case "erro":
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <TrendingUp className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex flex-col">
      <div className="flex-1">
        <div className="container mx-auto p-6 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{tabData.name}</h1>
                <div
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    isRollout ? "bg-green-100 text-green-800" : "bg-purple-100 text-purple-800"
                  }`}
                >
                  {isRollout ? "Rollout de Sistema" : "Testes de Integração"}
                </div>
              </div>
              <p className="text-gray-600">
                Última atualização: {lastUpdate.toLocaleString("pt-BR")} • Atualização automática a cada minuto
              </p>
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
              <Button variant="outline" onClick={copyShareLink} className="shadow-sm">
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </Button>
              <Button onClick={fetchData} disabled={loading} variant="outline" className="shadow-sm">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
              <Button variant="outline" onClick={handleExport} className="shadow-sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card
              className={`shadow-lg border-0 text-white ${
                isRollout
                  ? "bg-gradient-to-r from-green-500 to-green-600"
                  : "bg-gradient-to-r from-purple-500 to-purple-600"
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${isRollout ? "text-green-100" : "text-purple-100"}`}>
                      {isRollout ? "Total de Lojas" : "Total de Testes"}
                    </p>
                    <p className="text-3xl font-bold">{tabData.rows.length}</p>
                  </div>
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      isRollout ? "bg-green-400/30" : "bg-purple-400/30"
                    }`}
                  >
                    {isRollout ? <Store className="w-6 h-6" /> : <TestTube className="w-6 h-6" />}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">
                      {isRollout ? "Progresso do Rollout" : "Taxa de Sucesso"}
                    </p>
                    <p className="text-3xl font-bold">{progress.successPercentage}%</p>
                    <p className="text-blue-200 text-xs mt-1">
                      {progress.completed} de {progress.total} {isRollout ? "concluídos" : "aprovados"}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-400/30 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {Object.entries(statusCounts)
              .slice(0, 2)
              .map(([status, count], index) => (
                <Card key={status} className="shadow-lg border-0 bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm font-medium">{status}</p>
                        <p className="text-2xl font-bold text-gray-900">{count}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {((count / tabData.rows.length) * 100).toFixed(1)}% do total
                        </p>
                      </div>
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center ${getStatusColor(status)}`}
                      >
                        {getStatusIcon(status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>

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
                    <Bar dataKey="count" fill={isRollout ? "#10b981" : "#8b5cf6"} radius={[4, 4, 0, 0]} />
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

          {/* Progress Overview */}
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-900">
                {isRollout
                  ? `Progresso do Rollout (${tabData.rows.length} lojas)`
                  : `Resultados dos Testes (${tabData.rows.length} testes)`}
              </CardTitle>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
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
                {!isRollout && progress.failed > 0 && (
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
                    className={`h-3 rounded-full transition-all duration-500 ${
                      isRollout
                        ? "bg-gradient-to-r from-green-500 to-green-600"
                        : "bg-gradient-to-r from-purple-500 to-purple-600"
                    }`}
                    style={{ width: `${progress.successPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Lista de Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tabData.rows.slice(0, 12).map((row, index) => {
                  const itemName = isRollout
                    ? row.loja || row.restaurante || row.cliente || row.nome || row.unidade || `Loja ${index + 1}`
                    : row.pdv ||
                      row.terminal ||
                      row.equipamento ||
                      row.nome_pdv ||
                      row.nome_teste ||
                      row.teste ||
                      row.loja ||
                      row.nome_do_restaurante ||
                      `PDV ${index + 1}`

                  const itemType = isRollout
                    ? row.status === "Concluído" || row.status === "Concluido"
                      ? "Novo"
                      : "Antigo"
                    : row.tipo_teste || row.categoria || row.tipo || row.pdv_integradora || "PDV"

                  return (
                    <div
                      key={index}
                      className="p-4 bg-gray-50/50 rounded-lg hover:bg-gray-100/50 transition-colors border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 truncate flex-1 mr-2" title={itemName}>
                          {itemName}
                        </h4>
                        <div
                          className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(row.status || "Sem Status")}`}
                        >
                          {getStatusIcon(row.status || "Sem Status")}
                          <span>{row.status || "Sem Status"}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {isRollout ? `Sistema: ${itemType}` : `Tipo: ${itemType}`}
                      </div>
                    </div>
                  )
                })}
              </div>
              {tabData.rows.length > 12 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">
                    Mostrando 12 de {tabData.rows.length} {isRollout ? "lojas" : "testes"}. Use a exportação para ver
                    todos os dados.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}
