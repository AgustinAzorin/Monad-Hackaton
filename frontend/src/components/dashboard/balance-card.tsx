"use client"

import { ArrowDownRight, ArrowUpRight, Eye, EyeOff, X } from "lucide-react"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export interface BalanceEntry {
  id: string
  name: string
  amount: number
}

interface BalanceCardProps {
  owes: number
  owed: number
  currency?: string
  /** Cuentas con saldo en contra (lo que debés), derivadas de datos reales. */
  debtors?: BalanceEntry[]
  /** Cuentas con saldo a favor (lo que te deben), derivadas de datos reales. */
  creditors?: BalanceEntry[]
}

export function BalanceCard({
  owes,
  owed,
  currency = "$",
  debtors = [],
  creditors = [],
}: BalanceCardProps) {
  const [showBalance, setShowBalance] = useState(true)
  const [activePanel, setActivePanel] = useState<"debes" | "te-deben" | null>(null)

  // El saldo disponible es la diferencia entre lo que te deben y lo que debes
  const balance = owed - owes

  const formatCurrency = (amount: number, compact = false) => {
    if (compact && amount >= 1000000) {
      return new Intl.NumberFormat("es-AR", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(amount)
    }
    return new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const handleDebesClick = () => {
    setActivePanel(activePanel === "debes" ? null : "debes")
  }

  const handleTeDeben = () => {
    setActivePanel(activePanel === "te-deben" ? null : "te-deben")
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      <Card className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/80 p-3 sm:p-6 text-primary-foreground">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50" />

        <div className="relative">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-sm font-medium opacity-80">Saldo disponible</p>
              <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1 sm:gap-2">
                <span className="text-xl sm:text-4xl font-bold tracking-tight tabular-nums">
                  {balance < 0 && showBalance ? "-" : ""}
                  {currency}
                  {showBalance ? formatCurrency(Math.abs(balance)) : "****"}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10 h-7 w-7 sm:h-10 sm:w-10 shrink-0"
              onClick={() => setShowBalance(!showBalance)}
            >
              {showBalance ? <Eye className="h-4 w-4 sm:h-5 sm:w-5" /> : <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>
          </div>

          <div className="mt-3 sm:mt-6 grid grid-cols-2 gap-2 sm:gap-4">
            <button
              onClick={handleDebesClick}
              className={`rounded-lg p-2 sm:p-3 text-left transition-all ${
                activePanel === "debes"
                  ? "bg-primary-foreground/20 ring-2 ring-primary-foreground/40"
                  : "bg-primary-foreground/10 hover:bg-primary-foreground/15"
              }`}
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="flex h-5 w-5 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-destructive/20 shrink-0">
                  <ArrowUpRight className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-destructive" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-xs opacity-70">Debes</p>
                  <p className="text-[11px] sm:text-base font-semibold tabular-nums truncate">
                    {currency}
                    {showBalance ? formatCurrency(owes, true) : "****"}
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={handleTeDeben}
              className={`rounded-lg p-2 sm:p-3 text-left transition-all ${
                activePanel === "te-deben"
                  ? "bg-primary-foreground/20 ring-2 ring-primary-foreground/40"
                  : "bg-primary-foreground/10 hover:bg-primary-foreground/15"
              }`}
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="flex h-5 w-5 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-success/20 shrink-0">
                  <ArrowDownRight className="h-2.5 w-2.5 sm:h-4 sm:w-4 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-xs opacity-70">Te deben</p>
                  <p className="text-[11px] sm:text-base font-semibold tabular-nums truncate">
                    {currency}
                    {showBalance ? formatCurrency(owed, true) : "****"}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </Card>

      {/* Panel de saldos deudores */}
      {activePanel === "debes" && (
        <Card className="overflow-hidden border-destructive/20">
          <div className="flex items-center justify-between bg-destructive/10 px-3 sm:px-4 py-2 sm:py-3">
            <h3 className="font-semibold text-destructive text-xs sm:text-sm">Saldos Deudores (Debes)</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 sm:h-6 sm:w-6 text-destructive hover:bg-destructive/20"
              onClick={() => setActivePanel(null)}
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
          {debtors.length > 0 ? (
            <>
              <div className="divide-y divide-border">
                {debtors.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2.5 sm:p-4 hover:bg-muted/50 transition-colors">
                    <div className="min-w-0 flex-1 mr-2">
                      <p className="font-medium text-xs sm:text-sm truncate">{item.name}</p>
                    </div>
                    <p className="font-semibold text-destructive text-xs sm:text-base tabular-nums shrink-0">
                      -{currency}{formatCurrency(item.amount, true)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between bg-muted/50 px-3 sm:px-4 py-2 sm:py-3 border-t">
                <span className="font-medium text-xs sm:text-sm">Total</span>
                <span className="font-bold text-destructive text-sm sm:text-base">
                  -{currency}{formatCurrency(debtors.reduce((sum, item) => sum + item.amount, 0), true)}
                </span>
              </div>
            </>
          ) : (
            <p className="p-4 text-center text-xs sm:text-sm text-muted-foreground">No tenés saldos en contra.</p>
          )}
        </Card>
      )}

      {/* Panel de saldos acreedores */}
      {activePanel === "te-deben" && (
        <Card className="overflow-hidden border-success/20">
          <div className="flex items-center justify-between bg-success/10 px-3 sm:px-4 py-2 sm:py-3">
            <h3 className="font-semibold text-success text-xs sm:text-sm">Saldos Acreedores (Te deben)</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 sm:h-6 sm:w-6 text-success hover:bg-success/20"
              onClick={() => setActivePanel(null)}
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
          {creditors.length > 0 ? (
            <>
              <div className="divide-y divide-border">
                {creditors.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2.5 sm:p-4 hover:bg-muted/50 transition-colors">
                    <div className="min-w-0 flex-1 mr-2">
                      <p className="font-medium text-xs sm:text-sm truncate">{item.name}</p>
                    </div>
                    <p className="font-semibold text-success text-xs sm:text-base tabular-nums shrink-0">
                      +{currency}{formatCurrency(item.amount, true)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between bg-muted/50 px-3 sm:px-4 py-2 sm:py-3 border-t">
                <span className="font-medium text-xs sm:text-sm">Total</span>
                <span className="font-bold text-success text-sm sm:text-base">
                  +{currency}{formatCurrency(creditors.reduce((sum, item) => sum + item.amount, 0), true)}
                </span>
              </div>
            </>
          ) : (
            <p className="p-4 text-center text-xs sm:text-sm text-muted-foreground">Nadie te debe por ahora.</p>
          )}
        </Card>
      )}
    </div>
  )
}
