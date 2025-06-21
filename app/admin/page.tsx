"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Database, Activity, Clock, Users, ArrowLeft, Lock, Settings2 } from "lucide-react"
import { LoadingSpinner } from "../../components/loading-spinner"
import { Footer } from "../../components/footer"
import { getDatabaseStatsAction, updateTabAction, getTabsAction } from "../actions"
import { toast } from "sonner"
import Link from "next/link"
import type { TabData } from "../../types"

interface DatabaseStats {
  totalTabs: number
  totalRows: number
  recentActivity: number
  lastUpdate: string
}

export default function AdminPage() {
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [tabs, setTabs] = useState<TabData[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [authError, setAuthError] = useState(false)
  const [updatingTab, setUpdatingTab] = useState<string | null>(null)

  const handleAuth = () => {
    if (password === "5784") {
      setIsAuthenticated(true)
      setAuthError(false)
      loadInitialData()
    } else {
      setAuthError(true)
    }
  }

  const loadInitialData = async () => {
    await Promise.all([fetchStats(), loadTabs()])
  }

  const fetchStats = async () => {
    try {
      const data = await getDatabaseStatsAction()
      setStats(data)
      setLastRefresh(new Date())
    } catch (error) {
      console.error("Error fetching stats:", error)
      toast.error("Erro ao carregar estatísticas")
    }
  }

  const loadTabs = async () => {
    try {
      setLoading(true)
      console.log("🔄 Carregando abas...")
      const result = await getTabsAction()
      console.log("📊 Resultado getTabsAction:", result)

      if (result && Array.isArray(result)) {
        setTabs(result)
        console.log("✅ Abas carregadas:", result.length)
      } else if (result && result.success && result.tabs) {
        setTabs(result.tabs)
        console.log("✅ Abas carregadas:", result.tabs.length)
      } else {
        console.error("❌ Formato inesperado:", result)
        setTabs([])
      }
    } catch (error) {
      console.error("❌ Erro crítico ao carregar abas:", error)
      toast.error("Erro crítico ao carregar abas")
      setTabs([])
    } finally {
      setLoading(false)
    }
  }

  const updateTabType = async (tabId: string, newType: "rollout" | "testing") => {
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab) {
      toast.error("Aba não encontrada")
      return
    }

    try {
      setUpdatingTab(tabId)
      console.log(`🔄 Atualizando aba ${tab.name} de ${tab.dashboardType || "rollout"} para ${newType}`)

      const result = await updateTabAction({
        id: tab.id,
        name: tab.name,
        columns: tab.columns,
        dashboardType: newType,
      })

      console.log("📊 Resultado da atualização:", result)

      if (result.success) {
        // Atualizar o estado local imediatamente
        setTabs((prevTabs) => prevTabs.map((t) => (t.id === tabId ? { ...t, dashboardType: newType } : t)))

        toast.success(
          `Dashboard configurado como ${newType === "rollout" ? "Rollout de Sistema" : "Testes de Integração"}!`,
        )

        // Aguardar um pouco e recarregar para garantir sincronização
        setTimeout(() => {
          loadTabs()
        }, 500)
      } else {
        toast.error(`Erro ao atualizar tipo: ${result.error}`)
        console.error("Erro ao atualizar:", result.error)
      }
    } catch (error) {
      toast.error("Erro ao atualizar tipo")
      console.error("Erro crítico:", error)
    } finally {
      setUpdatingTab(null)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      loadInitialData()
      const interval = setInterval(fetchStats, 60000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])

  const getConnectionStatus = () => {
    if (!stats) return { status: "disconnected", color: "bg-red-500", text: "Desconectado" }

    const timeDiff = new Date().getTime() - new Date(stats.lastUpdate).getTime()
    if (timeDiff < 60000) return { status: "connected", color: "bg-green-500", text: "Conectado" }
    if (timeDiff < 300000) return { status: "warning", color: "bg-yellow-500", text: "Instável" }
    return { status: "disconnected", color: "bg-red-500", text: "Desconectado" }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
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
                  <Button variant="outline" className="w-full hover:scale-105 transition-transform duration-200">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                </Link>
                <Button
                  onClick={handleAuth}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 hover:scale-105 transition-all duration-200"
                >
                  Acessar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    )
  }

  const connectionStatus = getConnectionStatus()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex flex-col">
      <div className="flex-1">
        <div className="container mx-auto p-6 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button
                  variant="outline"
                  className="shadow-sm hover:scale-105 hover:shadow-md transition-all duration-200"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Sistema
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo</h1>
                <p className="text-gray-600">Configuração de tipos de dashboard e monitoramento</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${connectionStatus.color}`}></div>
                <span className="text-sm text-gray-600">{connectionStatus.text}</span>
              </div>
              <Button
                onClick={loadInitialData}
                disabled={loading}
                variant="outline"
                className="hover:scale-105 hover:shadow-md transition-all duration-200"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="shadow-lg border-0 hover:scale-105 hover:shadow-xl transition-all duration-200">
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

            <Card className="shadow-lg border-0 hover:scale-105 hover:shadow-xl transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total de Abas</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? <LoadingSpinner size="sm" /> : tabs.length}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 hover:scale-105 hover:shadow-xl transition-all duration-200">
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

            <Card className="shadow-lg border-0 hover:scale-105 hover:shadow-xl transition-all duration-200">
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

          {/* Gerenciamento de Abas */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings2 className="w-5 h-5 text-blue-600" />
                <span className="text-xl font-semibold text-gray-900">Configuração de Tipos de Dashboard</span>
              </CardTitle>
              <p className="text-gray-600">
                Configure se cada aba será exibida como Rollout de Sistema ou Testes de Integração
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="lg" />
                  <span className="ml-3 text-gray-600">Carregando abas...</span>
                </div>
              ) : tabs.length > 0 ? (
                <div className="space-y-3">
                  {tabs.map((tab) => {
                    const currentType = tab.dashboardType || "rollout"
                    const isRollout = currentType === "rollout"
                    const isUpdating = updatingTab === tab.id

                    console.log(`🔍 Tab ${tab.name}: currentType=${currentType}, isRollout=${isRollout}`)

                    return (
                      <div
                        key={tab.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 hover:scale-[1.02] transition-all duration-200"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-3 h-3 rounded-full transition-all duration-300 ${
                              isRollout
                                ? "bg-green-500 shadow-lg shadow-green-500/50"
                                : "bg-purple-500 shadow-lg shadow-purple-500/50"
                            }`}
                          />
                          <div>
                            <span className="font-medium text-gray-900 hover:text-blue-600 transition-colors duration-200">
                              {tab.name}
                            </span>
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <span>{tab.rows?.length || 0} registros</span>
                              <span>•</span>
                              <span>{tab.columns?.length || 0} colunas</span>
                              <span>•</span>
                              <Badge
                                variant={isRollout ? "default" : "secondary"}
                                className={`text-xs transition-all duration-300 ${
                                  isRollout
                                    ? "bg-green-100 text-green-800 border-green-300"
                                    : "bg-purple-100 text-purple-800 border-purple-300"
                                }`}
                              >
                                {isRollout ? "Rollout" : "Testes"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {isUpdating && (
                            <div className="flex items-center space-x-2 text-blue-600">
                              <LoadingSpinner size="sm" />
                              <span className="text-sm">Salvando...</span>
                            </div>
                          )}
                          <Select
                            value={currentType}
                            onValueChange={(value) => {
                              console.log(`🔄 Mudando ${tab.name} para ${value}`)
                              updateTabType(tab.id, value as "rollout" | "testing")
                            }}
                            disabled={isUpdating}
                          >
                            <SelectTrigger className="w-56 hover:scale-105 transition-transform duration-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="rollout">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 rounded-full bg-green-500" />
                                  <span>Rollout de Sistema</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="testing">
                                <div className="flex items-center space-x-2">
                                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                                  <span>Testes de Integração</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Settings2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="font-medium">Nenhuma aba encontrada</p>
                  <p className="text-sm">Crie uma nova aba na página principal para configurar</p>
                  <Link href="/">
                    <Button variant="outline" className="mt-4 hover:scale-105 transition-transform duration-200">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Ir para página principal
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="shadow-lg border-0 hover:scale-105 hover:shadow-xl transition-all duration-200">
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
                  <Badge variant="secondary">1 minuto</Badge>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Status de Otimização</span>
                  <Badge variant="default">Ativo</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 hover:scale-105 hover:shadow-xl transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-900">Tipos de Dashboard</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors duration-200">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <div>
                      <div className="font-medium text-green-900">Rollout de Sistema</div>
                      <div className="text-sm text-green-700">Para acompanhar implementação em lojas/unidades</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors duration-200">
                    <div className="w-3 h-3 rounded-full bg-purple-500" />
                    <div>
                      <div className="font-medium text-purple-900">Testes de Integração</div>
                      <div className="text-sm text-purple-700">Para acompanhar testes de PDVs/equipamentos</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}
