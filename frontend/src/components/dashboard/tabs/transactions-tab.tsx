"use client"

import { ArrowDownLeft, ArrowUpRight, Clock, CheckCircle2, Inbox } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { TransaccionConDetalle } from "@/types/cuenta"

interface TransactionsTabProps {
  transacciones: TransaccionConDetalle[]
}

const estadoConfig = {
  PENDIENTE: { label: "Pendiente", icon: Clock, variant: "secondary" as const },
  COMPLETADO: { label: "Completado", icon: CheckCircle2, variant: "default" as const },
}

export function TransactionsTab({ transacciones }: TransactionsTabProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(Math.abs(amount))

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })

  const recientes = [...transacciones]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 8)

  if (recientes.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <Inbox className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Todavía no hay transacciones.</p>
      </Card>
    )
  }

  return (
    <Card className="divide-y divide-border gap-0 py-0">
      {recientes.map((tx) => {
        const entra = tx.direccion === "HACIA_MI"
        const status = estadoConfig[tx.estado]
        const StatusIcon = status.icon
        const nombre = tx.contraparte?.nombre || tx.contraparte?.email || "Contacto"
        const desc = tx.descripcion || (tx.tipo === "PAGO" ? "Pago" : "Factura")

        return (
          <div key={tx.id} className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                entra ? "bg-success/10" : "bg-muted"
              }`}
            >
              {entra ? (
                <ArrowDownLeft className="h-5 w-5 text-success" />
              ) : (
                <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-medium">{desc}</p>
                <Badge variant={status.variant} className="hidden items-center gap-1 sm:flex">
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="truncate">{nombre}</span>
                <span>•</span>
                <span>{formatDate(tx.created_at)}</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">{tx.tipo === "PAGO" ? "Pago" : "Factura"}</span>
              </div>
            </div>

            <div className="text-right">
              <p className={`font-semibold tabular-nums ${entra ? "text-success" : "text-foreground"}`}>
                {entra ? "+" : "-"}
                {formatCurrency(tx.monto)}
              </p>
              <Badge variant={status.variant} className="mt-1 sm:hidden">
                {status.label}
              </Badge>
            </div>
          </div>
        )
      })}
    </Card>
  )
}
