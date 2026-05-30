"use client"

import { TransactionStatus } from "@/lib/data"

const statusConfig: Record<
  TransactionStatus,
  { label: string; className: string }
> = {
  pendiente: {
    label: "Pendiente",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  procesando: {
    label: "Procesando",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  pagado: {
    label: "Pagado",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  cobrado: {
    label: "Cobrado",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  vencido: {
    label: "Vencido",
    className: "bg-red-100 text-red-700 border-red-200",
  },
  parcialmente_pagado: {
    label: "Parcial",
    className: "bg-cyan-100 text-cyan-700 border-cyan-200",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-zinc-100 text-zinc-600 border-zinc-200",
  },
  devuelto: {
    label: "Devuelto",
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },
  rechazado: {
    label: "Rechazado",
    className: "bg-red-100 text-red-700 border-red-200",
  },
  entregado: {
    label: "Entregado",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
}

export function StatusBadge({ status }: { status: TransactionStatus }) {
  const config = statusConfig[status]

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {config.label}
    </span>
  )
}
