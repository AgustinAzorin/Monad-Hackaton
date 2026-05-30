"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, Clock, Info, BellOff } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { CuentaCorriente, TransaccionConDetalle } from "@/types/cuenta"

interface NotificationsTabProps {
  transacciones: TransaccionConDetalle[]
  cuentas: CuentaCorriente[]
}

type Alerta = {
  id: string
  title: string
  message: string
  type: "warning" | "reminder" | "info"
  time: string
}

const typeConfig = {
  warning: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
  reminder: { icon: Clock, color: "text-primary", bg: "bg-primary/10" },
  info: { icon: Info, color: "text-muted-foreground", bg: "bg-muted" },
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const horas = Math.floor(diff / 3_600_000)
  if (horas < 1) return "Hace instantes"
  if (horas < 24) return `Hace ${horas} h`
  const dias = Math.floor(horas / 24)
  return dias === 1 ? "Ayer" : `Hace ${dias} días`
}

export function NotificationsTab({ transacciones, cuentas }: NotificationsTabProps) {
  const [allRead, setAllRead] = useState(false)

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(Math.abs(amount))

  const alertas: Alerta[] = useMemo(() => {
    const result: Alerta[] = []

    transacciones
      .filter((tx) => tx.estado === "PENDIENTE")
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      .slice(0, 6)
      .forEach((tx) => {
        const nombre = tx.contraparte?.nombre || tx.contraparte?.email || "un contacto"
        const esFactura = tx.tipo === "FACTURA"
        result.push({
          id: tx.id,
          title: esFactura ? "Factura pendiente" : "Pago pendiente",
          message: `${esFactura ? "Factura" : "Pago"} de ${formatCurrency(tx.monto)} con ${nombre} sin completar`,
          type: esFactura ? "warning" : "reminder",
          time: relativeTime(tx.created_at),
        })
      })

    cuentas
      .filter((c) => c.saldo_relativo < 0)
      .slice(0, 3)
      .forEach((c) => {
        const nombre = c.contraparte?.nombre || c.contraparte?.email || "un contacto"
        result.push({
          id: `saldo-${c.id}`,
          title: "Saldo en contra",
          message: `Le debés ${formatCurrency(c.saldo_relativo)} a ${nombre}`,
          type: "info",
          time: relativeTime(c.updated_at),
        })
      })

    return result
  }, [transacciones, cuentas])

  if (alertas.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <BellOff className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No tenés alertas pendientes. ¡Todo al día!</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-muted-foreground">Alertas recientes</h3>
        {!allRead && (
          <Button variant="ghost" size="sm" className="text-primary" onClick={() => setAllRead(true)}>
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {alertas.map((n) => {
        const config = typeConfig[n.type]
        const Icon = config.icon

        return (
          <Card
            key={n.id}
            className={`gap-0 p-4 transition-colors ${!allRead ? "bg-primary/5 border-primary/20" : ""}`}
          >
            <div className="flex gap-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.bg}`}>
                <Icon className={`h-5 w-5 ${config.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-medium flex items-center gap-2">
                      {n.title}
                      {!allRead && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{n.time}</span>
                </div>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
