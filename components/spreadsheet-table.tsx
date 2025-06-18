"use client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
import { EditableCell } from "./editable-cell"
import type { TabData } from "../types"

interface SpreadsheetTableProps {
  tabData: TabData
  onUpdateData: (data: TabData) => void
}

export function SpreadsheetTable({ tabData, onUpdateData }: SpreadsheetTableProps) {
  const addRow = () => {
    const newRow: { id: string } = {
      id: Date.now().toString(),
    }

    tabData.columns.forEach((col) => {
      newRow[col.key] = ""
    })

    const updatedData = {
      ...tabData,
      rows: [...tabData.rows, newRow],
    }
    onUpdateData(updatedData)
  }

  const deleteRow = (rowId: string) => {
    const updatedData = {
      ...tabData,
      rows: tabData.rows.filter((row) => row.id !== rowId),
    }
    onUpdateData(updatedData)
  }

  const updateCell = (rowId: string, columnKey: string, value: any) => {
    const updatedData = {
      ...tabData,
      rows: tabData.rows.map((row) => (row.id === rowId ? { ...row, [columnKey]: value } : row)),
    }
    onUpdateData(updatedData)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{tabData.name}</h2>
        <Button onClick={addRow} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Linha
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              {tabData.columns.map((column) => (
                <TableHead
                  key={column.key}
                  className="font-medium text-gray-700 border-r last:border-r-0"
                  style={{ width: column.width ? `${column.width}px` : "auto" }}
                >
                  {column.label}
                </TableHead>
              ))}
              <TableHead className="w-12">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tabData.rows.map((row, index) => (
              <TableRow key={row.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                {tabData.columns.map((column) => (
                  <TableCell key={column.key} className="p-0 border-r last:border-r-0">
                    <EditableCell
                      value={row[column.key]}
                      column={column}
                      onSave={(value) => updateCell(row.id, column.key, value)}
                    />
                  </TableCell>
                ))}
                <TableCell className="p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteRow(row.id)}
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
