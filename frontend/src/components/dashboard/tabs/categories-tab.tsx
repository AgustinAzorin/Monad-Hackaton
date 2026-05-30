"use client"

import { useState } from "react"
import { Building2, Truck, Receipt, Wallet, ShoppingCart, Users, X, ArrowUpRight, ArrowDownLeft, FileText, Calendar, ChevronLeft } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Transaction {
  id: string
  description: string
  amount: number
  type: "income" | "expense"
  date: string
  contact: string
  status: "paid" | "pending" | "overdue"
  invoiceNumber?: string
}

interface Category {
  id: number
  name: string
  icon: React.ComponentType<{ className?: string }>
  total: number
  paid: number
  color: string
  transactions: Transaction[]
}

const categories: Category[] = [
  {
    id: 1,
    name: "Proveedores",
    icon: Building2,
    total: 125000,
    paid: 85000,
    color: "bg-chart-1",
    transactions: [
      { id: "p1", description: "Compra materias primas", amount: 45000, type: "expense", date: "2024-01-15", contact: "Proveedor ABC S.A.", status: "paid", invoiceNumber: "FC-2024-0125" },
      { id: "p2", description: "Insumos de oficina", amount: 8500, type: "expense", date: "2024-01-14", contact: "Papelera Central", status: "paid", invoiceNumber: "FC-2024-0089" },
      { id: "p3", description: "Equipos informaticos", amount: 31500, type: "expense", date: "2024-01-12", contact: "TechSupply S.A.", status: "pending", invoiceNumber: "FC-2024-0098" },
      { id: "p4", description: "Repuestos maquinaria", amount: 40000, type: "expense", date: "2024-01-10", contact: "Repuestos Industrial", status: "overdue", invoiceNumber: "FC-2024-0067" },
    ]
  },
  {
    id: 2,
    name: "Logistica",
    icon: Truck,
    total: 45000,
    paid: 45000,
    color: "bg-chart-2",
    transactions: [
      { id: "l1", description: "Transporte CABA", amount: 15000, type: "expense", date: "2024-01-15", contact: "Logistica Express", status: "paid", invoiceNumber: "FC-2024-0130" },
      { id: "l2", description: "Envio interior", amount: 22000, type: "expense", date: "2024-01-13", contact: "TransArgentina", status: "paid", invoiceNumber: "FC-2024-0112" },
      { id: "l3", description: "Flete urgente", amount: 8000, type: "expense", date: "2024-01-11", contact: "Logistica Express", status: "paid", invoiceNumber: "FC-2024-0095" },
    ]
  },
  {
    id: 3,
    name: "Impuestos",
    icon: Receipt,
    total: 32000,
    paid: 12000,
    color: "bg-chart-3",
    transactions: [
      { id: "i1", description: "IVA Enero", amount: 18000, type: "expense", date: "2024-01-20", contact: "AFIP", status: "pending" },
      { id: "i2", description: "Ingresos Brutos", amount: 12000, type: "expense", date: "2024-01-15", contact: "ARBA", status: "paid" },
      { id: "i3", description: "Retenciones", amount: 2000, type: "expense", date: "2024-01-10", contact: "AFIP", status: "overdue" },
    ]
  },
  {
    id: 4,
    name: "Servicios",
    icon: Wallet,
    total: 18500,
    paid: 18500,
    color: "bg-chart-4",
    transactions: [
      { id: "s1", description: "Electricidad", amount: 8500, type: "expense", date: "2024-01-10", contact: "Edenor", status: "paid" },
      { id: "s2", description: "Internet y telefonia", amount: 4500, type: "expense", date: "2024-01-08", contact: "Telecom", status: "paid" },
      { id: "s3", description: "Gas", amount: 3500, type: "expense", date: "2024-01-05", contact: "Metrogas", status: "paid" },
      { id: "s4", description: "Agua", amount: 2000, type: "expense", date: "2024-01-03", contact: "AySA", status: "paid" },
    ]
  },
  {
    id: 5,
    name: "Compras",
    icon: ShoppingCart,
    total: 67000,
    paid: 42000,
    color: "bg-chart-5",
    transactions: [
      { id: "c1", description: "Stock mercaderia", amount: 35000, type: "expense", date: "2024-01-14", contact: "Distribuidora Norte", status: "paid", invoiceNumber: "FC-2024-0118" },
      { id: "c2", description: "Productos terminados", amount: 25000, type: "expense", date: "2024-01-12", contact: "FabricaXYZ", status: "pending", invoiceNumber: "FC-2024-0102" },
      { id: "c3", description: "Embalajes", amount: 7000, type: "expense", date: "2024-01-08", contact: "PackSolutions", status: "paid", invoiceNumber: "FC-2024-0078" },
    ]
  },
  {
    id: 6,
    name: "Salarios",
    icon: Users,
    total: 280000,
    paid: 280000,
    color: "bg-primary",
    transactions: [
      { id: "sa1", description: "Sueldos Enero", amount: 220000, type: "expense", date: "2024-01-05", contact: "Nomina", status: "paid" },
      { id: "sa2", description: "Cargas sociales", amount: 45000, type: "expense", date: "2024-01-10", contact: "AFIP", status: "paid" },
      { id: "sa3", description: "Aguinaldo proporcional", amount: 15000, type: "expense", date: "2024-01-05", contact: "Nomina", status: "paid" },
    ]
  },
]

export function CategoriesTab() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-success/10 text-success">Pagado</span>
      case "pending":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-600">Pendiente</span>
      case "overdue":
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-destructive/10 text-destructive">Vencido</span>
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const percentage = Math.round((category.paid / category.total) * 100)
          const pending = category.total - category.paid

          return (
            <Card
              key={category.id}
              className="cursor-pointer p-4 transition-all hover:shadow-md active:scale-[0.98]"
              onClick={() => setSelectedCategory(category)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${category.color} text-card`}>
                    <category.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(category.total)}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {percentage}%
                </span>
              </div>

              <div className="mt-4">
                <Progress value={percentage} className="h-2" />
              </div>

              <div className="mt-3 flex justify-between text-xs">
                <span className="text-success">
                  Pagado: {formatCurrency(category.paid)}
                </span>
                {pending > 0 && (
                  <span className="text-destructive">
                    Pendiente: {formatCurrency(pending)}
                  </span>
                )}
              </div>

              <p className="mt-2 text-[10px] text-muted-foreground">
                {category.transactions.length} transacciones
              </p>
            </Card>
          )
        })}
      </div>

      {/* Category Transactions Dialog */}
      <Dialog open={!!selectedCategory} onOpenChange={() => setSelectedCategory(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] p-0 flex flex-col">
          <DialogHeader className="p-4 border-b shrink-0">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:hidden"
                onClick={() => setSelectedCategory(null)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {selectedCategory && (
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${selectedCategory.color} text-card`}>
                  <selectedCategory.icon className="h-5 w-5" />
                </div>
              )}
              <div>
                <DialogTitle className="text-base font-semibold">{selectedCategory?.name}</DialogTitle>
                <p className="text-xs text-muted-foreground">
                  {selectedCategory?.transactions.length} transacciones
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 ml-auto hidden sm:flex"
                onClick={() => setSelectedCategory(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Summary */}
          {selectedCategory && (
            <div className="px-4 py-3 bg-muted/30 border-b shrink-0">
              <div className="flex justify-between text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Total</p>
                  <p className="font-semibold">{formatCurrency(selectedCategory.total)}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">Pagado</p>
                  <p className="font-semibold text-success">{formatCurrency(selectedCategory.paid)}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-xs">Pendiente</p>
                  <p className="font-semibold text-destructive">{formatCurrency(selectedCategory.total - selectedCategory.paid)}</p>
                </div>
              </div>
              <Progress value={Math.round((selectedCategory.paid / selectedCategory.total) * 100)} className="h-2 mt-3" />
            </div>
          )}

          {/* Transactions List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selectedCategory?.transactions.map((tx) => (
              <Card key={tx.id} className="p-3">
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    tx.type === "income" ? "bg-success/10" : "bg-destructive/10"
                  }`}>
                    {tx.type === "income" ? (
                      <ArrowDownLeft className="h-4 w-4 text-success" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{tx.description}</p>
                        <p className="text-xs text-muted-foreground truncate">{tx.contact}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-semibold text-sm tabular-nums ${
                          tx.type === "income" ? "text-success" : "text-foreground"
                        }`}>
                          {tx.type === "expense" ? "-" : "+"}{formatCurrency(tx.amount)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {getStatusBadge(tx.status)}
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(tx.date)}
                      </span>
                      {tx.invoiceNumber && (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          {tx.invoiceNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
