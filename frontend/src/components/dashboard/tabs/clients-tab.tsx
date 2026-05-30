"use client"

import { useMemo, useState } from "react"
import { Building2, User, TrendingUp, TrendingDown, MessageCircle, ChevronRight, Users } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AccountDetailDialog } from "../account-detail-dialog"
import type { CuentaCorriente, TransaccionConDetalle } from "@/types/cuenta"

interface ClientsTabProps {
  cuentas: CuentaCorriente[]
  transacciones: TransaccionConDetalle[]
  onRefresh?: () => void
}

interface ContactView {
  cuenta: CuentaCorriente
  name: string
  type: "client" | "supplier"
  balance: number
  txCount: number
}

export function ClientsTab({ cuentas, transacciones, onRefresh }: ClientsTabProps) {
  const [selected, setSelected] = useState<CuentaCorriente | null>(null)
  const [open, setOpen] = useState(false)
  const [initialTab, setInitialTab] = useState<"historial" | "chat">("historial")

  const contacts: ContactView[] = useMemo(() => {
    const countByCuenta: Record<string, number> = {}
    for (const tx of transacciones) {
      countByCuenta[tx.cuenta_corriente_id] = (countByCuenta[tx.cuenta_corriente_id] ?? 0) + 1
    }
    return cuentas.map((c) => ({
      cuenta: c,
      name: c.contraparte?.nombre || c.contraparte?.email || "Contacto",
      type: c.saldo_relativo >= 0 ? "client" : "supplier",
      balance: c.saldo_relativo,
      txCount: countByCuenta[c.id] ?? 0,
    }))
  }, [cuentas, transacciones])

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

  const openDetail = (cuenta: CuentaCorriente, tab: "historial" | "chat") => {
    setSelected(cuenta)
    setInitialTab(tab)
    setOpen(true)
  }

  if (contacts.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <Users className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Todavía no tenés cuentas con contactos.</p>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {contacts.map((contact) => (
          <Card
            key={contact.cuenta.id}
            className="p-3 sm:p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => openDetail(contact.cuenta, "historial")}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                <AvatarFallback className={contact.type === "client" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}>
                  {getInitials(contact.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm sm:text-base truncate">{contact.name}</h3>
                  <span className={`hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    contact.type === "client" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
                  }`}>
                    {contact.type === "client" ? (
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
                <p className="text-xs sm:text-sm text-muted-foreground">{contact.txCount} transacciones</p>
                {contact.balance !== 0 && (
                  <div className="flex items-center gap-1 mt-1 sm:hidden">
                    {contact.balance > 0 ? (
                      <TrendingUp className="h-3 w-3 text-success" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-destructive" />
                    )}
                    <p className={`text-xs font-medium tabular-nums ${contact.balance > 0 ? "text-success" : "text-destructive"}`}>
                      {contact.balance > 0 ? "Te debe " : "Debes "}
                      {formatCurrency(contact.balance)}
                    </p>
                  </div>
                )}
              </div>

              <div className="hidden sm:block text-right">
                {contact.balance !== 0 ? (
                  <div className="flex items-center gap-1">
                    {contact.balance > 0 ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                    <p className={`font-semibold tabular-nums ${contact.balance > 0 ? "text-success" : "text-destructive"}`}>
                      {contact.balance > 0 ? "Te debe " : "Debes "}
                      {formatCurrency(contact.balance)}
                    </p>
                  </div>
                ) : (
                  <p className="font-medium text-muted-foreground">Al dia</p>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-9 w-9 sm:h-10 sm:w-10"
                onClick={(e) => {
                  e.stopPropagation()
                  openDetail(contact.cuenta, "chat")
                }}
              >
                <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </div>
          </Card>
        ))}
      </div>

      <AccountDetailDialog
        cuenta={selected}
        open={open}
        onOpenChange={setOpen}
        initialTab={initialTab}
        onChanged={onRefresh}
      />
    </>
  )
}
