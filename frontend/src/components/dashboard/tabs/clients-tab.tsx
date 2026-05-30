"use client"

import { Building2, User, ChevronRight, TrendingUp, TrendingDown, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { CuentaCorriente } from "@/types/cuenta"

interface ClientsTabProps {
  cuentas: CuentaCorriente[]
  txCountByCuenta: Record<string, number>
}

export function ClientsTab({ cuentas, txCountByCuenta }: ClientsTabProps) {
  const router = useRouter()

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(Math.abs(amount))

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()

  if (cuentas.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <Users className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No tenés cuentas corrientes aún.</p>
        <Button variant="link" className="text-primary" onClick={() => router.push("/cuentas")}>
          Crear una nueva
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {cuentas.map((cuenta) => {
        const nombre = cuenta.contraparte?.nombre || cuenta.contraparte?.email || "Contacto"
        const saldo = cuenta.saldo_relativo
        const teDebe = saldo > 0
        const count = txCountByCuenta[cuenta.id] ?? 0

        return (
          <Card
            key={cuenta.id}
            className="cursor-pointer p-4 transition-shadow hover:shadow-md"
            onClick={() => router.push(`/cuentas/${cuenta.id}`)}
          >
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className={teDebe ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}>
                  {getInitials(nombre)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-medium">{nombre}</h3>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      teDebe ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
                    }`}
                  >
                    {teDebe ? (
                      <>
                        <User className="h-3 w-3" />
                        Cliente
                      </>
                    ) : (
                      <>
                        <Building2 className="h-3 w-3" />
                        Proveedor
                      </>
                    )}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {count} {count === 1 ? "transacción" : "transacciones"}
                </p>
              </div>

              <div className="text-right">
                {saldo !== 0 ? (
                  <div className="flex items-center gap-1">
                    {teDebe ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                    <p className={`font-semibold tabular-nums ${teDebe ? "text-success" : "text-destructive"}`}>
                      {teDebe ? "Te debe " : "Debes "}
                      {formatCurrency(saldo)}
                    </p>
                  </div>
                ) : (
                  <p className="font-medium text-muted-foreground">Al día</p>
                )}
              </div>

              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          </Card>
        )
      })}
    </div>
  )
}
