"use client"

import { useState, useEffect } from "react"
import {
  Transaction,
  TransactionStatus,
  categories,
  paymentMethods,
} from "@/lib/data"
import { fetchMisTransacciones } from "@/lib/transacciones-api"
import { TransactionTable } from "@/components/transacciones/transaction-table"
import { TransactionDetail } from "@/components/transacciones/transaction-detail"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Plus,
  Filter,
  CalendarDays,
  X,
  ArrowDownUp,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const statuses: { value: TransactionStatus; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "procesando", label: "Procesando" },
  { value: "pagado", label: "Pagado" },
  { value: "cobrado", label: "Cobrado" },
  { value: "vencido", label: "Vencido" },
  { value: "parcialmente_pagado", label: "Parcialmente Pagado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "devuelto", label: "Devuelto" },
  { value: "rechazado", label: "Rechazado" },
  { value: "entregado", label: "Entregado" },
]

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  useEffect(() => {
    let active = true
    fetchMisTransacciones()
      .then((data) => {
        if (active) setTransactions(data)
      })
      .catch((err: unknown) => {
        if (active)
          setError(
            err instanceof Error
              ? err.message
              : "Error al cargar las transacciones",
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all")
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({ from: undefined, to: undefined })

  const handleSelectTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setDetailOpen(true)
  }

  const clearFilters = () => {
    setSearchQuery("")
    setTypeFilter("all")
    setStatusFilter("all")
    setCategoryFilter("all")
    setPaymentMethodFilter("all")
    setDateRange({ from: undefined, to: undefined })
  }

  const activeFiltersCount = [
    searchQuery,
    typeFilter !== "all" ? typeFilter : null,
    statusFilter !== "all" ? statusFilter : null,
    categoryFilter !== "all" ? categoryFilter : null,
    paymentMethodFilter !== "all" ? paymentMethodFilter : null,
    dateRange.from,
  ].filter(Boolean).length

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    if (
      searchQuery &&
      !t.clientOrProvider.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !t.id.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false
    }
    if (typeFilter !== "all" && t.type !== typeFilter) return false
    if (statusFilter !== "all" && t.status !== statusFilter) return false
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false
    if (paymentMethodFilter !== "all" && t.paymentMethod !== paymentMethodFilter)
      return false
    if (dateRange.from) {
      const transactionDate = new Date(t.createdAt)
      if (transactionDate < dateRange.from) return false
      if (dateRange.to && transactionDate > dateRange.to) return false
    }
    return true
  })

  // Calculate stats
  const totalIncome = transactions
    .filter((t) => t.type === "cobro" && ["cobrado", "entregado"].includes(t.status))
    .reduce((acc, t) => acc + t.amount, 0)

  const totalExpenses = transactions
    .filter((t) => t.type === "pago" && ["pagado", "entregado"].includes(t.status))
    .reduce((acc, t) => acc + t.amount, 0)

  const pendingAmount = transactions
    .filter((t) => ["pendiente", "procesando", "parcialmente_pagado"].includes(t.status))
    .reduce((acc, t) => acc + t.pendingBalance, 0)

  const overdueCount = transactions.filter((t) => t.status === "vencido").length

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Transacciones
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestiona pagos, cobros y trazabilidad financiera
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
            <Button size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4" />
              Nueva Transacción
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cobros Realizados</span>
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-foreground mt-2">
              {formatCurrency(totalIncome)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Este período</p>
          </div>

          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pagos Realizados</span>
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-600" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-foreground mt-2">
              {formatCurrency(totalExpenses)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Este período</p>
          </div>

          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Saldo Pendiente</span>
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-foreground mt-2">
              {formatCurrency(pendingAmount)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Por cobrar/pagar</p>
          </div>

          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Vencidas</span>
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-foreground mt-2">
              {overdueCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Requieren atención
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex flex-col gap-4">
            {/* Search and main filters row */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar transacción..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-secondary/50 border-border"
                />
              </div>

              {/* Filter dropdowns */}
              <div className="flex flex-wrap items-center gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[120px] bg-secondary/50 border-border">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pago">Pagos</SelectItem>
                    <SelectItem value="cobro">Cobros</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] bg-secondary/50 border-border">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {statuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px] bg-secondary/50 border-border">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={paymentMethodFilter}
                  onValueChange={setPaymentMethodFilter}
                >
                  <SelectTrigger className="w-[180px] bg-secondary/50 border-border">
                    <SelectValue placeholder="Método de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 bg-secondary/50 border-border"
                    >
                      <CalendarDays className="w-4 h-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "d MMM", { locale: es })} -{" "}
                            {format(dateRange.to, "d MMM", { locale: es })}
                          </>
                        ) : (
                          format(dateRange.from, "d MMM yyyy", { locale: es })
                        )
                      ) : (
                        "Fecha"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={(range) =>
                        setDateRange({ from: range?.from, to: range?.to })
                      }
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>

                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                    Limpiar ({activeFiltersCount})
                  </Button>
                )}
              </div>
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Mostrando {filteredTransactions.length} de {transactions.length}{" "}
                transacciones
              </span>
            </div>
          </div>
        </div>

        {/* Estados de carga / error / vacío */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-16">
            <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          </div>
        )}

        {!loading && !error && transactions.length === 0 && (
          <div className="rounded-lg border border-border bg-card py-16 text-center">
            <p className="text-sm text-muted-foreground">
              Todavía no tenés transacciones.
            </p>
          </div>
        )}

        {/* Table */}
        {!loading && !error && transactions.length > 0 && (
          <TransactionTable
            transactions={filteredTransactions}
            onSelectTransaction={handleSelectTransaction}
          />
        )}

        {/* Detail Sheet */}
        <TransactionDetail
          transaction={selectedTransaction}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
        />
      </div>
    </div>
  )
}
