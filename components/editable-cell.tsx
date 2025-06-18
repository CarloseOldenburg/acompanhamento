"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Expand, Eye } from "lucide-react"
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
    // Para selects, só salva se o valor mudou
    if (newValue !== originalValue) {
      onSave(newValue)
    }
  }

  if (column.type === "select") {
    return (
      <Select value={value || ""} onValueChange={handleSelectChange}>
        <SelectTrigger className="h-8 border-0 focus:ring-0">
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
    (column.width && column.width > 250)

  if (isEditing && isLongTextField) {
    return (
      <div className="p-2">
        <Textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="min-h-20 max-h-32 resize-none border focus:ring-1 focus:ring-blue-500 text-sm"
          placeholder="Digite sua observação... (Enter para salvar, Shift+Enter para nova linha)"
        />
      </div>
    )
  }

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="h-8 border-0 focus:ring-1 focus:ring-blue-500 text-sm"
        type={column.type === "date" ? "date" : column.type === "datetime" ? "datetime-local" : "text"}
      />
    )
  }

  // Renderização para campos de texto longo
  if (isLongTextField && value && value.length > 50) {
    const truncatedText = value.substring(0, 50) + "..."

    return (
      <div className="group relative min-h-8 px-3 py-2 cursor-text hover:bg-gray-50 flex items-center justify-between min-w-0">
        <span className="text-sm leading-tight flex-1 mr-2" onClick={() => setIsEditing(true)}>
          {truncatedText}
        </span>
        <Popover open={showFullText} onOpenChange={setShowFullText}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
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

  return (
    <div
      className="min-h-8 px-3 py-2 cursor-text hover:bg-gray-50 flex items-center min-w-0"
      onClick={() => setIsEditing(true)}
    >
      <span className="text-sm leading-tight break-words max-w-full">{value || ""}</span>
    </div>
  )
}
