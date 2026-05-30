"use client"

import { FileDown, FileUp, ArrowDownCircle, ArrowUpCircle, FolderKanban } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { TransaccionConDetalle } from "@/types/cuenta"

interface CategoriesTabProps {
  transacciones: TransaccionConDetalle[]
}

type Bucket = {
  id: string
  name: string
  icon: typeof FileDown
  color: string
  match: (tx: TransaccionConDetalle) => boolean
}

const buckets: Bucket[] = [
  {
    id: "fact-recibidas",
    name: "Facturas recibidas",
    icon: FileDown,
    color: "bg-chart-3",
    match: (tx) => tx.tipo === "FACTURA" && tx.direccion === "HACIA_MI",
  },
  {
    id: "fact-emitidas",
    name: "Facturas emitidas",
    icon: FileUp,
    color: "bg-chart-4",
    match: (tx) => tx.tipo === "FACTURA" && tx.direccion === "POR_MI",
  },
  {
    id: "pagos-recibidos",
    name: "Pagos recibidos",
    icon: ArrowDownCircle,
    color: "bg-chart-2",
    match: (tx) => tx.tipo === "PAGO" && tx.direccion === "HACIA_MI",
  },
  {
    id: "pagos-enviados",
    name: "Pagos enviados",
    icon: ArrowUpCircle,
    color: "bg-chart-1",
    match: (tx) => tx.tipo === "PAGO" && tx.direccion === "POR_MI",
  },
]

export function CategoriesTab({ transacciones }: CategoriesTabProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(amount)

  const categories = buckets
    .map((b) => {
      const items = transacciones.filter(b.match)
      const total = items.reduce((acc, tx) => acc + tx.monto, 0)
      const completado = items
        .filter((tx) => tx.estado === "COMPLETADO")
        .reduce((acc, tx) => acc + tx.monto, 0)
      return { ...b, total, completado, count: items.length }
    })
    .filter((c) => c.count > 0)

  if (categories.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <FolderKanban className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Sin movimientos para categorizar.</p>
      </Card>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => {
        const percentage = category.total > 0 ? Math.round((category.completado / category.total) * 100) : 0
        const pendiente = category.total - category.completado

        return (
          <Card key={category.id} className="cursor-pointer gap-0 p-4 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${category.color} text-card`}>
                  <category.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium leading-tight">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">{formatCurrency(category.total)}</p>
                </div>
              </div>
              <span className="text-xs font-medium text-muted-foreground">{percentage}%</span>
            </div>

            <div className="mt-4">
              <Progress value={percentage} className="h-2" />
            </div>

            <div className="mt-3 flex justify-between text-xs">
              <span className="text-success">Completado: {formatCurrency(category.completado)}</span>
              {pendiente > 0 && <span className="text-destructive">Pendiente: {formatCurrency(pendiente)}</span>}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
