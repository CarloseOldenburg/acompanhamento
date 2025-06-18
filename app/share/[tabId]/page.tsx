"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { RefreshCw, TrendingUp, Users, Clock, CheckCircle, Share2 } from "lucide-react"
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

  const fetchData = async () => {
    try {
      setLoading(true)
      const tabs = await getTabsAction()
      const tab = tabs.find((t) => t.id === tabId)
      if (tab) {
        setTabData(tab)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error("Error fetching data:", error)
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
      const exportData = tabData.rows.map((row) => ({
        "Carimbo de data/hora": row.timestamp || "",
        "Nome do Restaurante": row.nome || row.restaurante || "",
        "Telefone do Cliente": row.telefone || "",
        Solicitante: row.solicitante || "",
        "Merchant ID Totem": row.merchantId || "",
        "PDV / Integradora": row.pdv || "",
        Observação: row.observacao || "",
        Status: row.status || "",
        "Data de Agendamento": row.dataAgendamento || "",
      }))

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
      link.setAttribute("download", `${tabData.name}_${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success("Dados exportados com sucesso!")
    } catch (error) {
      toast.error("Erro ao exportar dados")
    }
  }

  if (loading && !tabData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (!tabData) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md text-center">
            <CardContent className="p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Dashboard não encontrado</h2>
              <p className="text-gray-600">O dashboard solicitado não existe ou foi removido.</p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    )
  }

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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "concluído":
      case "concluido":
        return "text-green-600 bg-green-100"
      case "pendente":
        return "text-yellow-600 bg-yellow-100"
      case "agendado":
        return "text-blue-600 bg-blue-100"
      case "em andamento":
        return "text-purple-600 bg-purple-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "concluído":
      case "concluido":
        return <CheckCircle className="w-4 h-4" />
      case "pendente":
        return <Clock className="w-4 h-4" />
      case "agendado":
        return <Users className="w-4 h-4" />
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
                <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  Dashboard Público
                </div>
              </div>
              <p className="text-gray-600">
                Última atualização: {lastUpdate.toLocaleString("pt-BR")} • Atualização automática a cada minuto
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={copyShareLink} className="shadow-sm">
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </Button>
              <Button onClick={fetchData} disabled={loading} variant="outline" className="shadow-sm">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
              <Button variant="outline" onClick={handleExport} className="shadow-sm">
                Exportar
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total</p>
                    <p className="text-3xl font-bold">{tabData.rows.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-400/30 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {Object.entries(statusCounts)
              .slice(0, 3)
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

          {/* Recent Activity */}
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-900">Registros Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tabData.rows.slice(0, 8).map((row: any, index: number) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between p-4 bg-gray-50/50 rounded-lg hover:bg-gray-100/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {row.nome || row.restaurante || row.cliente || row.loja || `Registro ${index + 1}`}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {row.observacao || row.descricao || "Sem observações"}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(row.status || "Pendente")}`}
                      >
                        {getStatusIcon(row.status || "Pendente")}
                        <span>{row.status || "Pendente"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}
