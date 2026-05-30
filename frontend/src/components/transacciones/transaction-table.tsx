"use client"

import { useState } from "react"
import { Transaction, TransactionStatus, TransactionType } from "@/lib/data"
import { StatusBadge } from "@/components/transacciones/status-badge"
import { DueCountdown } from "@/components/transacciones/due-countdown"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowUpDown,
  FileText,
  MoreHorizontal,
  ArrowDown,
  ArrowUp,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

interface TransactionTableProps {
  transactions: Transaction[]
  onSelectTransaction: (transaction: Transaction) => void
}

type SortField = "createdAt" | "dueDate" | "amount" | "clientOrProvider"
type SortDirection = "asc" | "desc"

export function TransactionTable({
  transactions,
  onSelectTransaction,
}: TransactionTableProps) {
  const [sortField, setSortField] = useState<SortField>("createdAt")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const sortedTransactions = [...transactions].sort((a, b) => {
    let comparison = 0
    switch (sortField) {
      case "createdAt":
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case "dueDate":
        comparison =
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        break
      case "amount":
        comparison = a.amount - b.amount
        break
      case "clientOrProvider":
        comparison = a.clientOrProvider.localeCompare(b.clientOrProvider)
        break
    }
    return sortDirection === "asc" ? comparison : -comparison
  })

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(transactions.map((t) => t.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const SortButton = ({
    field,
    children,
  }: {
    field: SortField
    children: React.ReactNode
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 text-xs font-medium text-muted-foreground hover:text-foreground"
      onClick={() => handleSort(field)}
    >
      {children}
      {sortField === field ? (
        sortDirection === "asc" ? (
          <ArrowUp className="ml-1 h-3 w-3" />
        ) : (
          <ArrowDown className="ml-1 h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
      )}
    </Button>
  )

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="w-12">
              <Checkbox
                checked={selectedIds.size === transactions.length}
                onCheckedChange={toggleSelectAll}
                aria-label="Seleccionar todos"
              />
            </TableHead>
            <TableHead className="w-[100px]">
              <span className="text-xs font-medium text-muted-foreground">ID</span>
            </TableHead>
            <TableHead>
              <SortButton field="clientOrProvider">
                Cliente / Proveedor
              </SortButton>
            </TableHead>
            <TableHead className="w-[80px]">
              <span className="text-xs font-medium text-muted-foreground">Tipo</span>
            </TableHead>
            <TableHead>
              <span className="text-xs font-medium text-muted-foreground">Categoría</span>
            </TableHead>
            <TableHead>
              <SortButton field="createdAt">Fecha</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="dueDate">Vencimiento</SortButton>
            </TableHead>
            <TableHead className="text-right">
              <SortButton field="amount">Monto</SortButton>
            </TableHead>
            <TableHead>
              <span className="text-xs font-medium text-muted-foreground">Estado</span>
            </TableHead>
            <TableHead className="w-[100px]">
              <span className="text-xs font-medium text-muted-foreground">Docs</span>
            </TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTransactions.map((transaction) => (
            <TableRow
              key={transaction.id}
              className="border-border cursor-pointer hover:bg-secondary/50 transition-colors"
              onClick={() => onSelectTransaction(transaction)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.has(transaction.id)}
                  onCheckedChange={() => toggleSelect(transaction.id)}
                  aria-label={`Seleccionar ${transaction.id}`}
                />
              </TableCell>
              <TableCell className="font-mono text-sm text-muted-foreground">
                {transaction.id}
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-foreground">
                    {transaction.clientOrProvider}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {transaction.responsiblePerson}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${
                    transaction.type === "pago"
                      ? "bg-red-500/10 text-red-400"
                      : "bg-emerald-500/10 text-emerald-400"
                  }`}
                >
                  {transaction.type === "pago" ? "Pago" : "Cobro"}
                </span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {transaction.category}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(parseISO(transaction.createdAt), "d MMM yyyy", {
                  locale: es,
                })}
              </TableCell>
              <TableCell>
                <DueCountdown
                  dueDate={transaction.dueDate}
                  status={transaction.status}
                />
              </TableCell>
              <TableCell className="text-right font-medium text-foreground tabular-nums">
                {formatCurrency(transaction.amount)}
              </TableCell>
              <TableCell>
                <StatusBadge status={transaction.status} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs">{transaction.documents.length}</span>
                </div>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem>Ver detalle</DropdownMenuItem>
                    <DropdownMenuItem>Editar</DropdownMenuItem>
                    <DropdownMenuItem>Duplicar</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Descargar documentos</DropdownMenuItem>
                    <DropdownMenuItem>Enviar recordatorio</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      Cancelar transacción
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
