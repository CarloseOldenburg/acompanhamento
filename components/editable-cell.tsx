"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Check, X } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { Column } from "../types"

interface EditableCellProps {
  value: any
  column: Column
  onSave: (value: any) => void
  isEditing?: boolean
}

export function EditableCell({ value, column, onSave, isEditing = false }: EditableCellProps) {
  const [isEditMode, setIsEditMode] = useState(isEditing)
  const [editValue, setEditValue] = useState(value || "")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    value && column.type === "date" ? new Date(value) : undefined,
  )

  useEffect(() => {
    setEditValue(value || "")
    if (column.type === "date" && value) {
      setSelectedDate(new Date(value))
    }
  }, [value, column.type])

  useEffect(() => {
    setIsEditMode(isEditing)
  }, [isEditing])

  const handleSave = () => {
    let finalValue = editValue

    if (column.type === "date" && selectedDate) {
      finalValue = format(selectedDate, "yyyy-MM-dd")
    } else if (column.type === "datetime" && selectedDate) {
      finalValue = selectedDate.toISOString()
    } else if (column.type === "number") {
      finalValue = Number.parseFloat(editValue) || 0
    }

    onSave(finalValue)
    setIsEditMode(false)
  }

  const handleCancel = () => {
    setEditValue(value || "")
    if (column.type === "date" && value) {
      setSelectedDate(new Date(value))
    } else {
      setSelectedDate(undefined)
    }
    setIsEditMode(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      handleCancel()
    }
  }

  const formatDisplayValue = (val: any) => {
    if (!val) return ""

    switch (column.type) {
      case "date":
        try {
          return format(new Date(val), "dd/MM/yyyy", { locale: ptBR })
        } catch {
          return val
        }
      case "datetime":
        try {
          return format(new Date(val), "dd/MM/yyyy HH:mm", { locale: ptBR })
        } catch {
          return val
        }
      case "number":
        return typeof val === "number" ? val.toLocaleString("pt-BR") : val
      default:
        return val
    }
  }

  if (!isEditMode) {
    return (
      <div
        className="min-h-[32px] px-2 py-1 cursor-pointer hover:bg-gray-100 rounded transition-colors flex items-center"
        onClick={() => setIsEditMode(true)}
        title="Clique para editar"
      >
        <span className="truncate">
          {formatDisplayValue(value) || <span className="text-gray-400 italic">Clique para editar</span>}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-1">
      <div className="flex-1">
        {column.type === "select" ? (
          <Select value={editValue} onValueChange={setEditValue}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {column.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : column.type === "date" ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-8 w-full justify-start text-left font-normal bg-transparent">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecionar data</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus locale={ptBR} />
            </PopoverContent>
          </Popover>
        ) : column.type === "datetime" ? (
          <div className="space-y-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-8 w-full justify-start text-left font-normal bg-transparent">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecionar data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus locale={ptBR} />
              </PopoverContent>
            </Popover>
            <Input
              type="time"
              className="h-8"
              value={selectedDate ? format(selectedDate, "HH:mm") : ""}
              onChange={(e) => {
                if (selectedDate && e.target.value) {
                  const [hours, minutes] = e.target.value.split(":")
                  const newDate = new Date(selectedDate)
                  newDate.setHours(Number.parseInt(hours), Number.parseInt(minutes))
                  setSelectedDate(newDate)
                }
              }}
            />
          </div>
        ) : (
          <Input
            type={column.type === "number" ? "number" : "text"}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8"
            autoFocus
          />
        )}
      </div>

      <div className="flex items-center space-x-1">
        <Button size="sm" onClick={handleSave} className="h-7 w-7 p-0">
          <Check className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="outline" onClick={handleCancel} className="h-7 w-7 p-0 bg-transparent">
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
