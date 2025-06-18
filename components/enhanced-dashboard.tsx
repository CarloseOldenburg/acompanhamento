"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { ArrowLeft, Download, TrendingUp, Users, Clock, CheckCircle } from "lucide-react"
import type { DashboardData } from "../types"
import { useMemo } from "react"

interface EnhancedDashboardProps {
  data: DashboardData
  onBack: () => void
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

export function EnhancedDashboard({ data, onBack }: EnhancedDashboardProps) {
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
            <Select defaultValue="todos">
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
            <Button variant="outline" className="shadow-sm">
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
                  <p className="text-blue-100 text-sm font-medium">Total de Registros</p>
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
            <CardTitle className="text-xl font-semibold text-gray-900">Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentActivity.slice(0, 8).map((row, index) => (
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
  )
}
