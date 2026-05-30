"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { DashboardHeader } from "./header"
import { BalanceCard } from "./balance-card"
import { QuickActions } from "./quick-actions"
import { NavigationTabs } from "./navigation-tabs"
import type { CuentaCorriente, TransaccionConDetalle } from "@/types/cuenta"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("access_token")
}

export function Dashboard() {
  const [cuentas, setCuentas] = useState<CuentaCorriente[]>([])
  const [transacciones, setTransacciones] = useState<TransaccionConDetalle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [noToken, setNoToken] = useState(false)

  const fetchData = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setNoToken(true)
      setLoading(false)
      return
    }

    try {
      const headers = { Authorization: `Bearer ${token}` }
      const [cRes, tRes] = await Promise.all([
        fetch(`${BACKEND_URL}/cuentas-corrientes`, { headers }),
        fetch(`${BACKEND_URL}/cuentas-corrientes/mis-transacciones`, { headers }),
      ])

      if (cRes.status === 401 || tRes.status === 401) {
        setNoToken(true)
        return
      }

      if (!cRes.ok || !tRes.ok) {
        setError("No se pudieron cargar tus datos. Intentá de nuevo.")
        return
      }

      setCuentas(await cRes.json())
      setTransacciones(await tRes.json())
    } catch {
      setError("Error de conexión con el servidor.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const { owes, owed, debtors, creditors } = useMemo(() => {
    let owesTotal = 0
    let owedTotal = 0
    const debtorList: { id: string; name: string; amount: number }[] = []
    const creditorList: { id: string; name: string; amount: number }[] = []
    for (const c of cuentas) {
      const name = c.contraparte?.nombre || c.contraparte?.email || "Contacto"
      if (c.saldo_relativo > 0) {
        owedTotal += c.saldo_relativo
        creditorList.push({ id: c.id, name, amount: c.saldo_relativo })
      } else if (c.saldo_relativo < 0) {
        owesTotal += Math.abs(c.saldo_relativo)
        debtorList.push({ id: c.id, name, amount: Math.abs(c.saldo_relativo) })
      }
    }
    return {
      owes: owesTotal,
      owed: owedTotal,
      debtors: debtorList,
      creditors: creditorList,
    }
  }, [cuentas])

  const pendientes = useMemo(
    () => transacciones.filter((t) => t.estado === "PENDIENTE").length,
    [transacciones],
  )

  if (noToken) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center text-foreground">
        <p className="text-muted-foreground">Tu sesión expiró o no iniciaste sesión.</p>
        <Link
          href="/login"
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Iniciar sesión
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardHeader alerts={pendientes} />

      <main className="mx-auto max-w-4xl px-4 py-6">
        {loading ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="mx-auto mt-8 max-w-md rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
            {error}
          </div>
        ) : (
          <div className="space-y-6">
            <section>
              <BalanceCard owes={owes} owed={owed} debtors={debtors} creditors={creditors} />
            </section>

            <section>
              <QuickActions cuentas={cuentas} />
            </section>

            <section>
              <NavigationTabs cuentas={cuentas} transacciones={transacciones} onRefresh={fetchData} />
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
