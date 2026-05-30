"use client"

import { useState } from "react"
import { ArrowDownLeft, ArrowUpRight, Clock, CheckCircle2, ChevronDown, ChevronUp, Calendar, Tag, User, Hash, CreditCard, Receipt, Inbox } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { TransaccionConDetalle } from "@/types/cuenta"

interface TransactionsTabProps {
  transacciones: TransaccionConDetalle[]
}

type DisplayStatus = "completed" | "pending" | "received"

const statusConfig: Record<DisplayStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  completed: { label: "Pagado", icon: CheckCircle2, className: "bg-primary/10 text-primary" },
  pending: { label: "Pendiente", icon: Clock, className: "bg-warning/10 text-warning" },
  received: { label: "Recibido", icon: CheckCircle2, className: "bg-success/10 text-success" },
}

export function TransactionsTab({ transacciones }: TransactionsTabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount))

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })

  const toggleExpand = (id: string) => setExpandedId(expandedId === id ? null : id)

  const recientes = [...transacciones].sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
  )

  if (recientes.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <Inbox className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Todavía no hay transacciones.</p>
      </Card>
    )
  }

  return (
    <Card className="divide-y divide-border overflow-hidden gap-0 py-0">
      {recientes.map((tx) => {
        const isPositive = tx.direccion === "HACIA_MI"
        const displayStatus: DisplayStatus =
          tx.estado === "PENDIENTE" ? "pending" : isPositive ? "received" : "completed"
        const status = statusConfig[displayStatus]
        const StatusIcon = status.icon
        const isExpanded = expandedId === tx.id

        const contact = tx.contraparte?.nombre || tx.contraparte?.email || "Contacto"
        const description = tx.descripcion || (tx.tipo === "PAGO" ? "Pago" : "Factura")
        const category = tx.tipo === "PAGO" ? "Pago" : "Factura"
        const method = tx.mercado_pago_preference_id || tx.mercado_pago_payment_id ? "Mercado Pago" : "Transferencia"
        const reference = tx.mercado_pago_payment_id || undefined
        const facturaUrl = tx.factura_url || tx.url_factura || undefined

        return (
          <div key={tx.id} className="bg-background">
            {/* Main row - clickable */}
            <button
              onClick={() => toggleExpand(tx.id)}
              className="w-full flex items-start gap-3 p-3 sm:p-4 transition-colors hover:bg-muted/50 text-left"
            >
              {/* Icon */}
              <div
                className={`flex-shrink-0 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full ${
                  isPositive ? "bg-success/10" : "bg-muted"
                }`}
              >
                {isPositive ? (
                  <ArrowDownLeft className="h-5 w-5 text-success" />
                ) : (
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm sm:text-base truncate">{description}</p>
                  <p
                    className={`flex-shrink-0 font-bold text-sm sm:text-base tabular-nums ${
                      isPositive ? "text-success" : "text-foreground"
                    }`}
                  >
                    {isPositive ? "+" : "-"}${formatCurrency(tx.monto)}
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{contact}</p>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="text-xs text-muted-foreground">{category}</span>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                  <span className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</span>
                  <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-5 ${status.className}`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
              </div>

              {/* Chevron */}
              {isExpanded ? (
                <ChevronUp className="flex-shrink-0 h-5 w-5 text-muted-foreground mt-1" />
              ) : (
                <ChevronDown className="flex-shrink-0 h-5 w-5 text-muted-foreground/50 mt-1" />
              )}
            </button>

            {/* Expanded detail panel */}
            {isExpanded && (
              <div className="px-3 pb-4 sm:px-4 sm:pb-5 bg-muted/30 border-t border-border">
                <div className="pt-4 space-y-4">
                  {/* General Info Section */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Contacto</p>
                        <p className="font-medium text-sm">{contact}</p>
                        {tx.contraparte?.dni && (
                          <p className="text-xs text-muted-foreground">DNI/CUIT: {tx.contraparte.dni}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Tipo</p>
                        <p className="font-medium text-sm">{category}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Metodo</p>
                        <p className="font-medium text-sm">{method}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Fecha</p>
                        <p className="font-medium text-sm">{formatDate(tx.created_at)}</p>
                      </div>
                    </div>
                    {reference && (
                      <div className="flex items-start gap-2 col-span-2">
                        <Hash className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Referencia de pago</p>
                          <p className="font-medium text-sm font-mono break-all">{reference}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Factura */}
                  {facturaUrl && (
                    <div className="bg-background rounded-lg p-3 border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <Receipt className="h-4 w-4 text-primary" />
                        <h4 className="font-semibold text-sm">Factura asociada</h4>
                      </div>
                      <a href={facturaUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="text-xs h-7">
                          <Receipt className="h-3 w-3 mr-1" />
                          Ver factura
                        </Button>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </Card>
  )
}
