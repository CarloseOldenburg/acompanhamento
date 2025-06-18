"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { ArrowLeft, Download, TrendingUp, Users, Clock, CheckCircle } from "lucide-react"
import type { DashboardData } from "../types"
import { useMemo, useState } from "react"
import { toast } from "sonner"

interface EnhancedDashboardProps {
  data: DashboardData
  onBack: () => void
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

export function EnhancedDashboard({ data, onBack }: EnhancedDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("todos")

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
      Object.entries(data.statusCounts).map(([status, count], index) => ({
        name: status,
        value: count,
        color: COLORS[index % COLORS.length],
      })),
    [data.statusCounts],
  )

  // Função para calcular porcentagens que somam exatamente 100%
  const calculatePercentages = useMemo(() => {
    const statusEntries = Object.entries(data.statusCounts)
    const total = data.totalRecords

    if (total === 0) return {}

    // Calcular porcentagens brutas
    const rawPercentages = statusEntries.map(([status, count]) => ({
      status,
      count,
      rawPercent: (count / total) * 100,
    }))

    // Arredondar e ajustar para somar 100%
    const percentages: { [key: string]: number } = {}
    let totalRounded = 0

    // Primeiro, arredondar normalmente
    rawPercentages.forEach(({ status, rawPercent }) => {
      const rounded = Math.round(rawPercent * 10) / 10 // Uma casa decimal
      percentages[status] = rounded
      totalRounded += rounded
    })

    // Ajustar se não somar 100%
    const difference = 100 - totalRounded
    if (Math.abs(difference) > 0.01) {
      // Encontrar o status com maior contagem para ajustar
      const maxStatus = rawPercentages.reduce((max, current) => (current.count > max.count ? current : max)).status

      percentages[maxStatus] = Math.round((percentages[maxStatus] + difference) * 10) / 10
    }

    return percentages
  }, [data.statusCounts, data.totalRecords])

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

  const handleExport = () => {
    try {
      // Criar dados para exportação
      const exportData = data.recentActivity.map((row) => ({
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

      // Converter para CSV
      const headers = Object.keys(exportData[0] || {})
      const csvContent = [
        headers.join(","),
        ...exportData.map((row) =>
          headers
            .map((header) => `"${(row[header as keyof typeof row] || "").toString().replace(/"/g, '""')}"`)
            .join(","),
        ),
      ].join("\n")

      // Download do arquivo
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `${data.tabName}_${new Date().toISOString().split("T")[0]}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success("Dados exportados com sucesso!")
    } catch (error) {
      toast.error("Erro ao exportar dados")
      console.error("Export error:", error)
    }
  }

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value)
    toast.info(`Filtro alterado para: ${value === "todos" ? "Todos os períodos" : value}`)
    // Aqui você pode implementar a lógica de filtro real
  }

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total</p>
                  <p className="text-3xl font-bold">{data.totalRecords}</p>
                </div>
                <div className="w-12 h-12 bg-blue-400/30 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {Object.entries(data.statusCounts)
            .slice(0, 3)
            .map(([status, count], index) => (
              <Card key={status} className="shadow-lg border-0 bg-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">{status}</p>
                      <p className="text-2xl font-bold text-gray-900">{count}</p>
                      <p className="text-xs text-gray-500 mt-1">{calculatePercentages[status]?.toFixed(1)}% do total</p>
                    </div>
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getStatusColor(status)}`}>
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
      </div>
    </div>
  )
}
