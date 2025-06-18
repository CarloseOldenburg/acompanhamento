"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { ArrowLeft, Download } from "lucide-react"
import type { DashboardData } from "../types"
import { useMemo, useState } from "react"
import { toast } from "sonner"

interface DashboardProps {
  data: DashboardData
  onBack: () => void
}

export function Dashboard({ data, onBack }: DashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("todos")

  const chartData = useMemo(
    () =>
      Object.entries(data.statusCounts).map(([status, count]) => ({
        status,
        count,
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold text-blue-600">{data.tabName}</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os períodos</SelectItem>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="semana">Esta semana</SelectItem>
              <SelectItem value="mes">Este mês</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalRecords}</div>
          </CardContent>
        </Card>

        {Object.entries(data.statusCounts).map(([status, count]) => (
          <Card key={status}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{status}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-xs text-gray-500">{calculatePercentages[status]?.toFixed(1)}% do total</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.statusCounts).map(([status, count], index) => (
                <div key={status} className="flex items-center justify-between p-2 rounded">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-medium">{status}</span>
                  </div>
                  <span className="text-sm font-bold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
