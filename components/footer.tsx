"use client"

import { Heart, Code, Coffee } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-gradient-to-r from-gray-50 to-blue-50/30 border-t border-gray-200/50 mt-16">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          {/* Main attribution */}
          <div className="flex items-center space-x-2 text-gray-600">
            <span className="text-sm">Desenvolvido por</span>
            <span className="font-semibold text-blue-600">Carlos Oldenburg</span>
            <Heart className="w-4 h-4 text-red-500 animate-pulse" />
          </div>

          {/* Tech stack */}
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Code className="w-3 h-3" />
              <span>Next.js</span>
            </div>
            <div className="flex items-center space-x-1">
              <Coffee className="w-3 h-3" />
              <span>PostgreSQL</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>🚀</span>
              <span>Vercel</span>
            </div>
          </div>

          {/* Year */}
          <div className="text-xs text-gray-400">© {new Date().getFullYear()} Sistema de Acompanhamento</div>
        </div>

        {/* Additional info */}
        <div className="mt-6 pt-4 border-t border-gray-200/50 text-center">
          <p className="text-xs text-gray-500">
            Sistema integrado com Google Sheets • Dashboard em tempo real • Banco de dados PostgreSQL
          </p>
        </div>
      </div>
    </footer>
  )
}
