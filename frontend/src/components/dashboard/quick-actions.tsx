"use client"

import { useState } from "react"
import { Plus, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NewTransactionForm } from "./new-transaction-form"
import { NewAccountForm } from "./new-account-form"
import type { CuentaCorriente } from "@/types/cuenta"

interface QuickActionsProps {
  cuentas?: CuentaCorriente[]
  onRefresh?: () => void
}

export function QuickActions({ cuentas = [], onRefresh }: QuickActionsProps) {
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [showAccountForm, setShowAccountForm] = useState(false)

  return (
    <>
      <div className="flex gap-2 sm:gap-3">
        <Button
          onClick={() => setShowTransactionForm(true)}
          className="flex-1 h-10 sm:h-12 gap-1.5 sm:gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs sm:text-sm"
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
          Nueva transaccion
        </Button>
        <Button
          onClick={() => setShowAccountForm(true)}
          variant="outline"
          className="flex-1 h-10 sm:h-12 gap-1.5 sm:gap-2 border-primary/20 hover:bg-primary/5 font-semibold text-xs sm:text-sm"
        >
          <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
          Agregar cuenta
        </Button>
      </div>

      <NewTransactionForm
        open={showTransactionForm}
        onOpenChange={setShowTransactionForm}
        cuentas={cuentas}
        onSaved={onRefresh}
      />
      <NewAccountForm
        open={showAccountForm}
        onOpenChange={setShowAccountForm}
        onSaved={onRefresh}
      />
    </>
  )
}
