"use client"

import { ArrowDownRight, ArrowUpRight, Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface BalanceCardProps {
  balance: number
  owes: number
  owed: number
  currency?: string
}

export function BalanceCard({ balance, owes, owed, currency = "$" }: BalanceCardProps) {
  const [showBalance, setShowBalance] = useState(true)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary to-primary/80 py-0 p-6 text-primary-foreground">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-80">Saldo neto</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight">
                {balance < 0 && showBalance ? "-" : ""}
                {currency}
                {showBalance ? formatCurrency(Math.abs(balance)) : "••••••"}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => setShowBalance(!showBalance)}
          >
            {showBalance ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-primary-foreground/10 p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/20">
                <ArrowUpRight className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <p className="text-xs opacity-70">Debes</p>
                <p className="font-semibold">
                  {currency}
                  {showBalance ? formatCurrency(owes) : "••••"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-primary-foreground/10 p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/20">
                <ArrowDownRight className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-xs opacity-70">Te deben</p>
                <p className="font-semibold">
                  {currency}
                  {showBalance ? formatCurrency(owed) : "••••"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
