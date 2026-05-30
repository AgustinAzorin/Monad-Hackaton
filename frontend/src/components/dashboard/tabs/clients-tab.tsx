"use client"

import { useMemo, useState } from "react"
import { Building2, User, TrendingUp, TrendingDown, MessageCircle, X, Send, Phone, Mail, ChevronRight, Plus, RotateCcw, FileText, DollarSign, Calendar, Hash, MapPin, CreditCard, ArrowUpRight, ArrowDownRight, Users } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { CuentaCorriente, TransaccionConDetalle } from "@/types/cuenta"

interface Message {
  id: string
  text: string
  sender: "user" | "contact"
  timestamp: Date
  type?: "message" | "refund" | "invoice"
}

interface HistoryItem {
  id: string
  date: string
  type: "ingreso" | "egreso"
  amount: number
  description: string
  invoice?: string
  status: "pagado" | "pendiente" | "vencido"
}

interface Contact {
  id: string
  name: string
  type: "client" | "supplier"
  balance: number
  transactions: number
  email?: string
  phone?: string
  cuit?: string
  address?: string
  bank?: string
  cbu?: string
  accountNumber?: string
  transactionHistory: HistoryItem[]
}

interface ClientsTabProps {
  cuentas: CuentaCorriente[]
  transacciones: TransaccionConDetalle[]
}

export function ClientsTab({ cuentas, transacciones }: ClientsTabProps) {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [showRefundDialog, setShowRefundDialog] = useState(false)
  const [refundAmount, setRefundAmount] = useState("")
  const [refundReason, setRefundReason] = useState("")

  const contacts: Contact[] = useMemo(() => {
    return cuentas.map((c) => {
      const history: HistoryItem[] = transacciones
        .filter((tx) => tx.cuenta_corriente_id === c.id)
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
        .map((tx) => ({
          id: tx.id,
          date: tx.created_at,
          type: tx.direccion === "HACIA_MI" ? "ingreso" : "egreso",
          amount: tx.monto,
          description: tx.descripcion || (tx.tipo === "PAGO" ? "Pago" : "Factura"),
          invoice: tx.mercado_pago_payment_id || undefined,
          status: tx.estado === "PENDIENTE" ? "pendiente" : "pagado",
        }))

      return {
        id: c.id,
        name: c.contraparte?.nombre || c.contraparte?.email || "Contacto",
        type: c.saldo_relativo >= 0 ? "client" : "supplier",
        balance: c.saldo_relativo,
        transactions: history.length,
        email: c.contraparte?.email || undefined,
        cuit: c.contraparte?.dni || undefined,
        transactionHistory: history,
      }
    })
  }, [cuentas, transacciones])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(Math.abs(amount))

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()

  const openChat = (contact: Contact, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedContact(contact)
    setChatMessages([])
    setChatOpen(true)
  }

  const openDetail = (contact: Contact) => {
    setSelectedContact(contact)
    setDetailOpen(true)
  }

  const sendMessage = () => {
    if (!newMessage.trim()) return
    const message: Message = {
      id: crypto.randomUUID(),
      text: newMessage,
      sender: "user",
      timestamp: new Date(),
      type: "message",
    }
    setChatMessages([...chatMessages, message])
    setNewMessage("")
  }

  const sendRefundRequest = () => {
    if (!refundAmount) return
    const message: Message = {
      id: crypto.randomUUID(),
      text: `Solicitud de reembolso: ${formatCurrency(parseFloat(refundAmount))}${refundReason ? ` - Motivo: ${refundReason}` : ""}`,
      sender: "user",
      timestamp: new Date(),
      type: "refund",
    }
    setChatMessages([...chatMessages, message])
    setRefundAmount("")
    setRefundReason("")
    setShowRefundDialog(false)
  }

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })

  const getStatusBadge = (status: HistoryItem["status"]) => {
    switch (status) {
      case "pagado":
        return <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px] sm:text-xs">Pagado</Badge>
      case "pendiente":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] sm:text-xs">Pendiente</Badge>
      case "vencido":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] sm:text-xs">Vencido</Badge>
    }
  }

  const calculateTotals = (history: HistoryItem[]) => {
    return history.reduce(
      (acc, t) => {
        acc.total += t.amount
        if (t.status === "pendiente" || t.status === "vencido") acc.pendiente += t.amount
        if (t.status === "pagado") acc.pagado += t.amount
        return acc
      },
      { total: 0, pendiente: 0, pagado: 0 },
    )
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
            key={contact.id}
            className="p-3 sm:p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => openDetail(contact)}
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
                    contact.type === "client"
                      ? "bg-success/10 text-success"
                      : "bg-primary/10 text-primary"
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
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {contact.transactions} transacciones
                </p>
                {contact.balance !== 0 && (
                  <div className="flex items-center gap-1 mt-1 sm:hidden">
                    {contact.balance > 0 ? (
                      <TrendingUp className="h-3 w-3 text-success" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-destructive" />
                    )}
                    <p className={`text-xs font-medium tabular-nums ${
                      contact.balance > 0 ? "text-success" : "text-destructive"
                    }`}>
                      {contact.balance > 0 ? "Te debe " : "Debes "}
                      {formatCurrency(contact.balance)}
                    </p>
                  </div>
                )}
              </div>

              <div className="hidden sm:block text-right">
                {contact.balance !== 0 && (
                  <div className="flex items-center gap-1">
                    {contact.balance > 0 ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                    <p className={`font-semibold tabular-nums ${
                      contact.balance > 0 ? "text-success" : "text-destructive"
                    }`}>
                      {contact.balance > 0 ? "Te debe " : "Debes "}
                      {formatCurrency(contact.balance)}
                    </p>
                  </div>
                )}
                {contact.balance === 0 && (
                  <p className="font-medium text-muted-foreground">Al dia</p>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-9 w-9 sm:h-10 sm:w-10"
                onClick={(e) => openChat(contact, e)}
              >
                <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </div>
          </Card>
        ))}
      </div>

      {/* Account Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-3 sm:p-4 pb-0 sticky top-0 bg-background z-10">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                <AvatarFallback className={selectedContact?.type === "client" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}>
                  {selectedContact ? getInitials(selectedContact.name) : ""}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-sm sm:text-base font-semibold truncate">{selectedContact?.name}</DialogTitle>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium ${
                    selectedContact?.type === "client"
                      ? "bg-success/10 text-success"
                      : "bg-primary/10 text-primary"
                  }`}>
                    {selectedContact?.type === "client" ? "Cliente" : "Proveedor"}
                  </span>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="p-3 sm:p-4 space-y-4">
            {/* Balance Summary */}
            <Card className={`p-3 sm:p-4 ${selectedContact?.balance && selectedContact.balance > 0 ? "border-success/20 bg-success/5" : selectedContact?.balance && selectedContact.balance < 0 ? "border-destructive/20 bg-destructive/5" : "border-muted"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Saldo actual</p>
                  <p className={`text-lg sm:text-2xl font-bold tabular-nums ${
                    selectedContact?.balance && selectedContact.balance > 0
                      ? "text-success"
                      : selectedContact?.balance && selectedContact.balance < 0
                      ? "text-destructive"
                      : "text-foreground"
                  }`}>
                    {selectedContact?.balance && selectedContact.balance > 0 ? "+" : ""}
                    {formatCurrency(selectedContact?.balance || 0)}
                  </p>
                </div>
                <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center ${
                  selectedContact?.balance && selectedContact.balance > 0
                    ? "bg-success/20"
                    : selectedContact?.balance && selectedContact.balance < 0
                    ? "bg-destructive/20"
                    : "bg-muted"
                }`}>
                  {selectedContact?.balance && selectedContact.balance > 0 ? (
                    <ArrowDownRight className="h-5 w-5 sm:h-6 sm:w-6 text-success" />
                  ) : selectedContact?.balance && selectedContact.balance < 0 ? (
                    <ArrowUpRight className="h-5 w-5 sm:h-6 sm:w-6 text-destructive" />
                  ) : (
                    <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                  )}
                </div>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                {selectedContact?.balance && selectedContact.balance > 0
                  ? "Este contacto te debe dinero"
                  : selectedContact?.balance && selectedContact.balance < 0
                  ? "Le debes dinero a esta cuenta"
                  : "Cuenta al dia"}
              </p>
            </Card>

            {/* Company Info */}
            {(selectedContact?.cuit || selectedContact?.email || selectedContact?.phone || selectedContact?.address) && (
              <div className="space-y-2">
                <h4 className="font-medium text-xs sm:text-sm text-muted-foreground">Datos del contacto</h4>
                <Card className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                  {selectedContact?.cuit && (
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">DNI / CUIT</p>
                        <p className="text-xs sm:text-sm font-medium">{selectedContact.cuit}</p>
                      </div>
                    </div>
                  )}
                  {selectedContact?.address && (
                    <div className="flex items-center gap-2 sm:gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Direccion</p>
                        <p className="text-xs sm:text-sm font-medium truncate">{selectedContact.address}</p>
                      </div>
                    </div>
                  )}
                  {selectedContact?.email && (
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Email</p>
                        <p className="text-xs sm:text-sm font-medium truncate">{selectedContact.email}</p>
                      </div>
                    </div>
                  )}
                  {selectedContact?.phone && (
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Telefono</p>
                        <p className="text-xs sm:text-sm font-medium">{selectedContact.phone}</p>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Bank Info */}
            {(selectedContact?.bank || selectedContact?.cbu) && (
              <div className="space-y-2">
                <h4 className="font-medium text-xs sm:text-sm text-muted-foreground">Datos bancarios</h4>
                <Card className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                  {selectedContact?.bank && (
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Banco</p>
                        <p className="text-xs sm:text-sm font-medium">{selectedContact.bank}</p>
                      </div>
                    </div>
                  )}
                  {selectedContact?.cbu && (
                    <div className="flex items-center gap-2 sm:gap-3">
                      <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">CBU</p>
                        <p className="text-xs sm:text-sm font-medium font-mono truncate">{selectedContact.cbu}</p>
                      </div>
                    </div>
                  )}
                  {selectedContact?.accountNumber && (
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs text-muted-foreground">N de cuenta</p>
                        <p className="text-xs sm:text-sm font-medium">{selectedContact.accountNumber}</p>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Transaction History */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-xs sm:text-sm text-muted-foreground">Historial de transacciones</h4>
                <span className="text-[10px] sm:text-xs text-muted-foreground">{selectedContact?.transactionHistory.length || 0} registros</span>
              </div>

              {selectedContact && selectedContact.transactionHistory.length > 0 ? (
                <>
                  {/* Totals */}
                  <div className="grid grid-cols-2 gap-2">
                    <Card className="p-2 sm:p-3 bg-muted/30">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Total operado</p>
                      <p className="text-sm sm:text-base font-semibold tabular-nums">
                        {formatCurrency(calculateTotals(selectedContact.transactionHistory).total)}
                      </p>
                    </Card>
                    <Card className="p-2 sm:p-3 bg-amber-500/5 border-amber-500/20">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Pendiente</p>
                      <p className="text-sm sm:text-base font-semibold tabular-nums text-amber-600">
                        {formatCurrency(calculateTotals(selectedContact.transactionHistory).pendiente)}
                      </p>
                    </Card>
                  </div>

                  {/* Transaction List */}
                  <Card className="divide-y divide-border overflow-hidden gap-0 py-0">
                    {selectedContact.transactionHistory.map((transaction) => (
                      <div key={transaction.id} className="p-2.5 sm:p-3 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                            <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center shrink-0 ${
                              transaction.type === "ingreso" ? "bg-success/10" : "bg-destructive/10"
                            }`}>
                              {transaction.type === "ingreso" ? (
                                <ArrowDownRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success" />
                              ) : (
                                <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm font-medium truncate">{transaction.description}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(transaction.date)}
                                </span>
                                {transaction.invoice && (
                                  <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    <span className="truncate max-w-[100px] sm:max-w-none">{transaction.invoice}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-xs sm:text-sm font-semibold tabular-nums ${
                              transaction.type === "ingreso" ? "text-success" : "text-destructive"
                            }`}>
                              {transaction.type === "ingreso" ? "+" : "-"}{formatCurrency(transaction.amount)}
                            </p>
                            <div className="mt-0.5">
                              {getStatusBadge(transaction.status)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </Card>
                </>
              ) : (
                <Card className="p-6 text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm text-muted-foreground">No hay transacciones registradas</p>
                </Card>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-9 sm:h-10 text-sm"
                onClick={() => {
                  setDetailOpen(false)
                  setChatMessages([])
                  setChatOpen(true)
                }}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Chat
              </Button>
              <Button className="flex-1 h-9 sm:h-10 text-sm">
                <Plus className="h-4 w-4 mr-2" />
                Nueva transaccion
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-md h-[80vh] p-0 flex flex-col">
          <DialogHeader className="p-3 sm:p-4 border-b shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                  <AvatarFallback className={selectedContact?.type === "client" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}>
                    {selectedContact ? getInitials(selectedContact.name) : ""}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <DialogTitle className="text-sm sm:text-base font-semibold truncate">{selectedContact?.name}</DialogTitle>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {selectedContact?.type === "client" ? "Cliente" : "Proveedor"}
                  </p>
                </div>
              </div>
              <div className="flex items-center shrink-0">
                {selectedContact?.phone && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
                    <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                )}
                {selectedContact?.email && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
                    <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Contact Info */}
          {selectedContact && (selectedContact.email || selectedContact.phone) && (
            <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-muted/30 border-b text-[10px] sm:text-xs text-muted-foreground shrink-0 truncate">
              {selectedContact.email && <span className="mr-2 sm:mr-3">{selectedContact.email}</span>}
              {selectedContact.phone && <span>{selectedContact.phone}</span>}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3">
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">No hay mensajes</p>
                <p className="text-xs">Inicia una conversacion</p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 ${
                      msg.type === "refund"
                        ? "bg-amber-500/10 border border-amber-500/30"
                        : msg.sender === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted rounded-bl-sm"
                    }`}
                  >
                    {msg.type === "refund" && (
                      <div className="flex items-center gap-1 mb-0.5 sm:mb-1">
                        <RotateCcw className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-600" />
                        <span className="text-[8px] sm:text-[10px] font-medium text-amber-600">REEMBOLSO</span>
                      </div>
                    )}
                    <p className={`text-xs sm:text-sm ${msg.type === "refund" ? "text-foreground" : ""}`}>{msg.text}</p>
                    <p className={`text-[8px] sm:text-[10px] mt-0.5 sm:mt-1 ${
                      msg.type === "refund"
                        ? "text-muted-foreground"
                        : msg.sender === "user"
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    }`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Refund Dialog */}
          {showRefundDialog && (
            <div className="p-3 sm:p-4 border-t bg-muted/30 space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium">Solicitar reembolso</span>
                <Button variant="ghost" size="icon" className="h-5 w-5 sm:h-6 sm:w-6" onClick={() => setShowRefundDialog(false)}>
                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
              <Input
                type="number"
                placeholder="Monto a reembolsar"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="h-9 text-sm"
              />
              <Input
                placeholder="Motivo (opcional)"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="h-9 text-sm"
              />
              <Button className="w-full h-9 text-sm" onClick={sendRefundRequest} disabled={!refundAmount}>
                <RotateCcw className="h-3.5 w-3.5 mr-2" />
                Enviar solicitud
              </Button>
            </div>
          )}

          {/* Input */}
          <div className="p-3 sm:p-4 border-t shrink-0">
            <div className="flex gap-1.5 sm:gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0 h-9 w-9 sm:h-10 sm:w-10">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setShowRefundDialog(true)}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Solicitar reembolso
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <FileText className="h-4 w-4 mr-2" />
                    Enviar factura
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Solicitar pago
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Input
                placeholder="Escribe un mensaje..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="flex-1 h-9 sm:h-10 text-sm"
              />
              <Button size="icon" onClick={sendMessage} disabled={!newMessage.trim()} className="shrink-0 h-9 w-9 sm:h-10 sm:w-10">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
