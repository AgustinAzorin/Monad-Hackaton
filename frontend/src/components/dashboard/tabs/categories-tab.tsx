"use client"

import { useEffect, useState } from "react"
import {
  Building2,
  Truck,
  Receipt,
  Wallet,
  ShoppingCart,
  Users,
  TrendingUp,
  FolderKanban,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Calendar,
  ChevronLeft,
  Loader2,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { apiFetch } from "@/lib/api"
import type { CategoriaResumen } from "@/types/cuenta"

// Mapea el nombre de ícono que devuelve el backend a un componente de lucide.
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2,
  Truck,
  Receipt,
  Wallet,
  ShoppingCart,
  Users,
  TrendingUp,
  FolderKanban,
}

interface CategoriesTabProps {
  // Cambia cuando se crean/actualizan transacciones para forzar la recarga.
  reloadKey?: number
}

export function CategoriesTab({ reloadKey }: CategoriesTabProps) {
  const [categories, setCategories] = useState<CategoriaResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<CategoriaResumen | null>(null)

  useEffect(() => {
    let cancelled = false
    apiFetch<CategoriaResumen[]>("/categories/resumen")
      .then((data) => {
        if (!cancelled) setCategories(data)
      })
      .catch(() => {
        if (!cancelled) setError("No se pudieron cargar las categorías.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

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
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
  }

  const iconFor = (name: string) => ICONS[name] ?? FolderKanban

  if (loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto mt-4 max-w-md rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <Card className="p-8 border-dashed text-center text-muted-foreground">
        <FolderKanban className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Todavía no hay transacciones categorizadas</p>
        <p className="text-xs mt-1">Asigná una categoría al crear una transacción y aparecerá acá.</p>
      </Card>
    )
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const Icon = iconFor(category.icon)
          const percentage =
            category.total > 0 ? Math.round((category.paid / category.total) * 100) : 0
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
                    <Icon className="h-5 w-5" />
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
              {selectedCategory && (() => {
                const Icon = iconFor(selectedCategory.icon)
                return (
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${selectedCategory.color} text-card`}>
                    <Icon className="h-5 w-5" />
                  </div>
                )
              })()}
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
              <Progress
                value={selectedCategory.total > 0 ? Math.round((selectedCategory.paid / selectedCategory.total) * 100) : 0}
                className="h-2 mt-3"
              />
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
