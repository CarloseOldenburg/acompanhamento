"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Expand, Eye, Copy } from "lucide-react"
import type { Column } from "../types"

interface EditableCellProps {
  value: any
  column: Column
  onSave: (value: any) => void
}

export function EditableCell({ value, column, onSave }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value || "")
  const [originalValue, setOriginalValue] = useState(value || "")
  const [showFullText, setShowFullText] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setEditValue(value || "")
    setOriginalValue(value || "")
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isEditing])

  const handleSave = () => {
    // Só salva se o valor realmente mudou
    if (editValue !== originalValue) {
      onSave(editValue)
      setOriginalValue(editValue)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(originalValue)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      handleCancel()
    }
  }

  const handleSelectChange = (newValue: string) => {
    // Para selects, sempre salva o novo valor
    onSave(newValue)
    setOriginalValue(newValue) // Atualiza o valor original
  }

  // Função para converter data para formato de input
  const formatDateForInput = (dateValue: string) => {
    if (!dateValue) return ""

    // Se já está no formato correto para input (YYYY-MM-DDTHH:MM)
    if (dateValue.includes("T") && dateValue.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)) {
      return dateValue.slice(0, 16) // Remove segundos se houver
    }

    // Se está no formato brasileiro (DD/MM/YYYY HH:MM)
    if (dateValue.includes("/")) {
      const [datePart, timePart] = dateValue.split(" ")
      if (datePart && timePart) {
        const [day, month, year] = datePart.split("/")
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${timePart}`
      }
    }

    return dateValue
  }

  // Função para converter data do input para formato de exibição
  const formatDateForDisplay = (inputValue: string) => {
    if (!inputValue) return ""

    if (inputValue.includes("T")) {
      const [date, time] = inputValue.split("T")
      const [year, month, day] = date.split("-")
      return `${day}/${month}/${year} ${time}`
    }

    return inputValue
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text || "")
      // Você pode adicionar um toast aqui se quiser
    } catch (err) {
      // Fallback para navegadores mais antigos
      const textArea = document.createElement("textarea")
      textArea.value = text || ""
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
    }
  }

  if (column.type === "select") {
    return (
      <Select value={value || ""} onValueChange={handleSelectChange}>
        <SelectTrigger className="h-8 border-0 focus:ring-0 text-xs">
          <SelectValue placeholder="Selecionar..." />
        </SelectTrigger>
        <SelectContent>
          {column.options?.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  // Para campos de texto longo (observação, descrição, etc.)
  const isLongTextField =
    column.key.toLowerCase().includes("observacao") ||
    column.key.toLowerCase().includes("descricao") ||
    (column.width && column.width > 180)

  if (isEditing && isLongTextField) {
    return (
      <div className="p-2">
        <Textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="min-h-20 max-h-32 resize-none border focus:ring-1 focus:ring-blue-500 text-xs"
          placeholder="Digite sua observação... (Enter para salvar, Shift+Enter para nova linha)"
        />
      </div>
    )
  }

  if (isEditing) {
    const inputType = column.type === "date" ? "date" : column.type === "datetime" ? "datetime-local" : "text"
    const inputValue = column.type === "datetime" || column.type === "date" ? formatDateForInput(editValue) : editValue

    return (
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => {
          if (column.type === "datetime" || column.type === "date") {
            setEditValue(e.target.value)
          } else {
            setEditValue(e.target.value)
          }
        }}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="h-8 border-0 focus:ring-1 focus:ring-blue-500 text-xs"
        type={inputType}
      />
    )
  }

  // Renderização para campos de texto longo
  if (isLongTextField && value && value.length > 30) {
    const truncatedText = value.substring(0, 30) + "..."

    return (
      <div className="group relative min-h-8 px-2 py-2 cursor-text hover:bg-gray-50 flex items-center justify-between min-w-0">
        <span className="text-xs leading-tight flex-1 mr-1" onClick={() => setIsEditing(true)}>
          {truncatedText}
        </span>
        <Popover open={showFullText} onOpenChange={setShowFullText}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Eye className="w-3 h-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 max-h-60 overflow-y-auto">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">{column.label}</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{value}</p>
              <Button
                size="sm"
                onClick={() => {
                  setShowFullText(false)
                  setIsEditing(true)
                }}
                className="w-full"
              >
                <Expand className="w-3 h-3 mr-1" />
                Editar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )
  }

  // Formatação especial para datas na exibição
  let displayValue = value || ""
  if ((column.type === "datetime" || column.key.toLowerCase().includes("data")) && value) {
    displayValue = formatDateForDisplay(value)
  }

  return (
    <div
      className="min-h-8 px-2 py-2 cursor-text hover:bg-gray-50 flex items-center justify-between min-w-0 group"
      onClick={() => setIsEditing(true)}
    >
      <span className="text-xs leading-tight break-words flex-1 truncate" title={displayValue}>
        {displayValue}
      </span>
      {displayValue && (
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
          onClick={(e) => {
            e.stopPropagation()
            copyToClipboard(displayValue)
          }}
          title="Copiar texto"
        >
          <Copy className="w-3 h-3" />
        </Button>
      )}
    </div>
  )
}
