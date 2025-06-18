"use client"

import { BarChart3, Database, Users, TrendingUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function HeroSection() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />

      <div className="relative px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8">
            <div className="inline-flex items-center rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-800 mb-4">
              <Database className="w-4 h-4 mr-2" />
              Sistema Conectado ao Banco de Dados
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Sistema de
              <span className="text-blue-600"> Acompanhamento</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
              Gerencie seus processos de integração, rollouts e ativações com dashboards em tempo real e colaboração
              entre equipes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Dashboards Inteligentes</h3>
                <p className="text-sm text-gray-600">
                  Visualize métricas e KPIs em tempo real com gráficos interativos
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Colaboração em Equipe</h3>
                <p className="text-sm text-gray-600">Trabalhe em conjunto com atualizações sincronizadas</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Análise Avançada</h3>
                <p className="text-sm text-gray-600">Insights detalhados para tomada de decisões estratégicas</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
