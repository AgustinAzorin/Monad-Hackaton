"use client"

import { ArrowDownToLine, ArrowUpFromLine, QrCode, Link2, Send, FileText } from "lucide-react"
import Link from "next/link"

const actions = [
  { icon: ArrowDownToLine, label: "Ingresar", color: "bg-primary/10 text-primary", href: "/cuentas" },
  { icon: Send, label: "Transferir", color: "bg-primary/10 text-primary", href: "/cuentas" },
  { icon: ArrowUpFromLine, label: "Retirar", color: "bg-primary/10 text-primary", href: "/cuentas" },
  { icon: QrCode, label: "Cobrar QR", color: "bg-success/10 text-success", href: "/cuentas" },
  { icon: Link2, label: "Link de pago", color: "bg-success/10 text-success", href: "/cuentas" },
  { icon: FileText, label: "Facturas", color: "bg-warning/10 text-warning", href: "/historial" },
]

export function QuickActions() {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className="flex h-auto flex-col items-center gap-2 rounded-xl bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${action.color}`}>
            <action.icon className="h-5 w-5" />
          </div>
          <span className="text-xs font-medium text-foreground">{action.label}</span>
        </Link>
      ))}
    </div>
  )
}
