"use client"

import { differenceInDays, parseISO, isAfter, isBefore, isToday } from "date-fns"
import { Clock, AlertTriangle, CheckCircle } from "lucide-react"

interface DueCountdownProps {
  dueDate: string
  status: string
}

export function DueCountdown({ dueDate, status }: DueCountdownProps) {
  const due = parseISO(dueDate)
  const now = new Date()
  const daysUntil = differenceInDays(due, now)

  // Don't show countdown for completed transactions
  if (["pagado", "cobrado", "entregado", "cancelado"].includes(status)) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-600">
        <CheckCircle className="w-3.5 h-3.5" />
        <span>Completado</span>
      </div>
    )
  }

  if (isToday(due)) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>Vence hoy</span>
      </div>
    )
  }

  if (isBefore(due, now)) {
    const daysOverdue = Math.abs(daysUntil)
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>Vencido hace {daysOverdue} día{daysOverdue !== 1 ? "s" : ""}</span>
      </div>
    )
  }

  if (daysUntil <= 3) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-600">
        <Clock className="w-3.5 h-3.5" />
        <span>Faltan {daysUntil} día{daysUntil !== 1 ? "s" : ""}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Clock className="w-3.5 h-3.5" />
      <span>Faltan {daysUntil} días</span>
    </div>
  )
}
