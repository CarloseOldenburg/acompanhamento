"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Column } from "../types"

interface EditableCellProps {
  value: any
  column: Column
  onSave: (value: any) => void
}

export function EditableCell({ value, column, onSave }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value || "")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  const handleSave = () => {
    onSave(editValue)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      setEditValue(value || "")
      setIsEditing(false)
    }
  }

  if (column.type === "select") {
    return (
      <Select value={value || ""} onValueChange={onSave}>
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

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="h-8 border-0 focus:ring-1 focus:ring-blue-500"
        type={column.type === "date" ? "date" : column.type === "datetime" ? "datetime-local" : "text"}
      />
    )
  }

  return (
    <div className="h-8 px-3 py-1 cursor-text hover:bg-gray-50 flex items-center" onClick={() => setIsEditing(true)}>
      {value || ""}
    </div>
  )
}
