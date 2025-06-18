"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Database, Activity, Clock, Users, ArrowLeft, Lock } from "lucide-react"
import { LoadingSpinner } from "../../components/loading-spinner"
import { getDatabaseStatsAction } from "../actions"
import Link from "next/link"

interface DatabaseStats {
  totalTabs: number
  totalRows: number
  recentActivity: number
  lastUpdate: string
}

export default function AdminPage() {
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [authError, setAuthError] = useState(false)

  const handleAuth = () => {
    if (password === "5784") {
      setIsAuthenticated(true)
      setAuthError(false)
      fetchStats()
    } else {
      setAuthError(true)
    }
  }

  const fetchStats = async () => {
    try {
      setLoading(true)
      const data = await getDatabaseStatsAction()
      setStats(data)
      setLastRefresh(new Date())
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats()
      const interval = setInterval(fetchStats, 60000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])

  const getConnectionStatus = () => {
    if (!stats) return { status: "disconnected", color: "bg-red-500" }

    const timeDiff = new Date().getTime() - new Date(stats.lastUpdate).getTime()
    if (timeDiff < 60000) return { status: "connected", color: "bg-green-500" }
    if (timeDiff < 300000) return { status: "warning", color: "bg-yellow-500" }
    return { status: "disconnected", color: "bg-red-500" }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Acesso Administrativo</CardTitle>
            <p className="text-gray-600">Digite a senha para acessar o painel</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha"
                className={`text-center text-lg ${authError ? "border-red-500" : ""}`}
                onKeyDown={(e) => e.key === "Enter" && handleAuth()}
              />
              {authError && <p className="text-red-500 text-sm mt-2 text-center">Senha incorreta</p>}
            </div>
            <div className="flex space-x-3">
              <Link href="/" className="flex-1">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <Button onClick={handleAuth} className="flex-1 bg-blue-600 hover:bg-blue-700">
                Acessar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const connectionStatus = getConnectionStatus()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="outline" className="shadow-sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Sistema
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo</h1>
              <p className="text-gray-600">Monitoramento do sistema e banco de dados</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${connectionStatus.color}`}></div>
              <span className="text-sm text-gray-600">
                {connectionStatus.status === "connected"
                  ? "Conectado"
                  : connectionStatus.status === "warning"
                    ? "Instável"
                    : "Desconectado"}
              </span>
            </div>
            <Button onClick={fetchStats} disabled={loading} variant="outline">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Status da Conexão</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <div className={`w-2 h-2 rounded-full ${connectionStatus.color}`}></div>
                    <Badge variant={connectionStatus.status === "connected" ? "default" : "destructive"}>
                      {connectionStatus.status === "connected" ? "Online" : "Offline"}
                    </Badge>
                  </div>
                </div>
                <Database className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total de Abas</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? <LoadingSpinner size="sm" /> : stats?.totalTabs || 0}
                  </p>
                </div>
                <Users className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total de Registros</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? <LoadingSpinner size="sm" /> : stats?.totalRows || 0}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Atividade (24h)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? <LoadingSpinner size="sm" /> : stats?.recentActivity || 0}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">Informações do Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Banco de Dados</span>
                <Badge variant="outline">PostgreSQL (Neon)</Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Última Atualização</span>
                <span className="text-sm text-gray-900">{lastRefresh.toLocaleTimeString("pt-BR")}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Intervalo de Sincronização</span>
                <Badge variant="secondary">30 segundos</Badge>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Status de Otimização</span>
                <Badge variant="default">Ativo</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">Configurações de Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Cache de Dados</span>
                <Badge variant="default">Habilitado</Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Revalidação Automática</span>
                <Badge variant="default">Ativo</Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Compressão de Dados</span>
                <Badge variant="default">Habilitada</Badge>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Modo de Sincronização</span>
                <Badge variant="secondary">Otimizado</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Database Connection Info */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">Informações de Conexão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Host:</span>
                  <span className="ml-2 text-gray-600">ep-flat-paper-a4d3try4-pooler.us-east-1.aws.neon.tech</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Database:</span>
                  <span className="ml-2 text-gray-600">neondb</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">SSL Mode:</span>
                  <span className="ml-2 text-gray-600">require</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Pool de Conexões:</span>
                  <span className="ml-2 text-gray-600">Ativo</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
