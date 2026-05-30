"use client"

import { Transaction } from "@/lib/data"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/transacciones/status-badge"
import { TransactionTimeline } from "@/components/transacciones/transaction-timeline"
import {
  FileText,
  Download,
  Mail,
  Phone,
  User,
  CreditCard,
  Building2,
  AlertTriangle,
  X,
  ExternalLink,
} from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

interface TransactionDetailProps {
  transaction: Transaction | null
  open: boolean
  onClose: () => void
}

const documentTypeLabels: Record<string, string> = {
  factura: "Factura",
  orden_compra: "Orden de Compra",
  comprobante: "Comprobante",
  recibo: "Recibo",
  otro: "Documento",
}

export function TransactionDetail({
  transaction,
  open,
  onClose,
}: TransactionDetailProps) {
  if (!transaction) return null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount)
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl bg-card border-border p-0">
        <SheetHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-lg font-semibold text-foreground">
                {transaction.id}
              </SheetTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {transaction.type === "pago" ? "Pago" : "Cobro"} •{" "}
                {transaction.category}
              </p>
            </div>
            <StatusBadge status={transaction.status} />
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-5rem)]">
          <div className="p-6 space-y-6">
            {/* Financial Summary */}
            <section>
              <h3 className="text-sm font-medium text-foreground mb-3">
                Resumen Financiero
              </h3>
              <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Monto Total
                  </span>
                  <span className="text-lg font-semibold text-foreground">
                    {formatCurrency(transaction.amount)}
                  </span>
                </div>
                <Separator className="bg-border/50" />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Saldo Pendiente</span>
                  <span
                    className={
                      transaction.pendingBalance > 0
                        ? "text-amber-600"
                        : "text-emerald-600"
                    }
                  >
                    {formatCurrency(transaction.pendingBalance)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Impuestos</span>
                  <span className="text-foreground">
                    {formatCurrency(transaction.taxes)}
                  </span>
                </div>
                {transaction.discounts > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Descuentos</span>
                    <span className="text-emerald-600">
                      -{formatCurrency(transaction.discounts)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Comisión</span>
                  <span className="text-foreground">
                    {formatCurrency(transaction.commission)}
                  </span>
                </div>
              </div>
            </section>

            {/* Contact Information */}
            <section>
              <h3 className="text-sm font-medium text-foreground mb-3">
                {transaction.type === "pago" ? "Proveedor" : "Cliente"}
              </h3>
              <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {transaction.clientOrProvider}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.category}
                    </p>
                  </div>
                </div>
                <Separator className="bg-border/50" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a
                      href={`mailto:${transaction.clientOrProviderEmail}`}
                      className="text-primary hover:underline"
                    >
                      {transaction.clientOrProviderEmail}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">
                      {transaction.clientOrProviderPhone}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Responsable:</span>
                    <span className="text-foreground">
                      {transaction.responsiblePerson}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Payment Details */}
            <section>
              <h3 className="text-sm font-medium text-foreground mb-3">
                Detalle de Pago
              </h3>
              <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Método</span>
                  <span className="text-foreground">
                    {transaction.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Banco</span>
                  <span className="text-foreground">{transaction.bank}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cuenta</span>
                  <span className="text-foreground font-mono">
                    {transaction.account}
                  </span>
                </div>
                {transaction.bankReference && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Referencia Bancaria
                    </span>
                    <span className="text-foreground font-mono">
                      {transaction.bankReference}
                    </span>
                  </div>
                )}
                {transaction.operationNumber && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      No. Operación
                    </span>
                    <span className="text-foreground font-mono">
                      {transaction.operationNumber}
                    </span>
                  </div>
                )}
              </div>
            </section>

            {/* Documents */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-foreground">
                  Documentos ({transaction.documents.length})
                </h3>
              </div>
              <div className="space-y-2">
                {transaction.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between bg-secondary/50 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {doc.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {documentTypeLabels[doc.type]}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            {/* Incidents */}
            {transaction.incidents.length > 0 && (
              <section>
                <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Incidencias ({transaction.incidents.length})
                </h3>
                <div className="space-y-2">
                  {transaction.incidents.map((incident) => (
                    <div
                      key={incident.id}
                      className="bg-red-50 border border-red-200 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-red-700">
                          {incident.type}
                        </span>
                        <Badge
                          variant={
                            incident.status === "resuelto"
                              ? "default"
                              : "outline"
                          }
                          className={
                            incident.status === "pendiente"
                              ? "border-amber-300 text-amber-700 bg-amber-50"
                              : incident.status === "en_proceso"
                              ? "border-blue-300 text-blue-700 bg-blue-50"
                              : "border-emerald-300 text-emerald-700 bg-emerald-50"
                          }
                        >
                          {incident.status === "pendiente"
                            ? "Pendiente"
                            : incident.status === "en_proceso"
                            ? "En Proceso"
                            : "Resuelto"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {incident.cause}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {format(parseISO(incident.date), "d MMM yyyy, HH:mm", {
                          locale: es,
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Timeline */}
            <section>
              <h3 className="text-sm font-medium text-foreground mb-3">
                Historial de Actividad
              </h3>
              <TransactionTimeline events={transaction.timeline} />
            </section>

            {/* Notes */}
            {transaction.notes && (
              <section>
                <h3 className="text-sm font-medium text-foreground mb-3">
                  Notas
                </h3>
                <div className="bg-secondary/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    {transaction.notes}
                  </p>
                </div>
              </section>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
