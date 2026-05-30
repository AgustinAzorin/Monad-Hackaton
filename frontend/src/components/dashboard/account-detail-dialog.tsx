"use client"

import { useState, useEffect, useCallback, useRef, type FormEvent } from "react"
import {
  X,
  ArrowLeftRight,
  MessageCircle,
  Lock,
  Send,
  CreditCard,
  FileUp,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  TrendingUp,
  TrendingDown,
  Plus,
  RotateCcw,
  DollarSign,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createSupabaseBrowserClient } from "@/lib/supabase-browser"
import {
  generateKeyPair,
  exportPublicKey,
  exportPrivateKey,
  importPublicKey,
  importPrivateKey,
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
  storeKeyPair,
  getStoredKeyPair,
} from "@/lib/crypto"
import type {
  CuentaCorriente,
  Transaccion,
  MensajeDescifrado,
  MensajeChat,
  FacturaEscaneada,
  MercadoPagoResult,
} from "@/types/cuenta"

const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY ?? ""
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("access_token")
}

function getUserId(): string | null {
  try {
    const token = getToken()
    if (!token) return null
    const payload = JSON.parse(atob(token.split(".")[1]))
    return payload.sub ?? null
  } catch {
    return null
  }
}

function formatSaldo(saldo: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(Math.abs(saldo))
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: "Error del servidor" }))
    throw new Error(
      Array.isArray(body.message) ? body.message.join(", ") : body.message,
    )
  }
  return res.json()
}

interface AccountDetailDialogProps {
  cuenta: CuentaCorriente | null
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTab?: "historial" | "chat"
  /** Se llama tras un pago/factura para refrescar el dashboard. */
  onChanged?: () => void
}

export function AccountDetailDialog({
  cuenta,
  open,
  onOpenChange,
  initialTab = "historial",
  onChanged,
}: AccountDetailDialogProps) {
  const cuentaId = cuenta?.id ?? ""
  const userId = getUserId()

  const [tab, setTab] = useState<"historial" | "chat">(initialTab)

  // Historial
  const [transacciones, setTransacciones] = useState<Transaccion[]>([])
  const [loadingTx, setLoadingTx] = useState(false)

  // Chat E2EE
  const [mensajes, setMensajes] = useState<MensajeDescifrado[]>([])
  const [chatInput, setChatInput] = useState("")
  const [sendingChat, setSendingChat] = useState(false)
  const [sharedKey, setSharedKey] = useState<CryptoKey | null>(null)
  const [chatReady, setChatReady] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Panel de solicitud dentro del chat (reembolso / cobro)
  const [requestMode, setRequestMode] = useState<"reembolso" | "cobro" | null>(null)
  const [requestAmount, setRequestAmount] = useState("")
  const [requestReason, setRequestReason] = useState("")
  const [sendingRequest, setSendingRequest] = useState(false)

  // Modal pago
  const [showPagoModal, setShowPagoModal] = useState(false)
  const [pagoMonto, setPagoMonto] = useState("")
  const [pagoDesc, setPagoDesc] = useState("")
  const [pagando, setPagando] = useState(false)
  const [pagoStep, setPagoStep] = useState<"monto" | "tarjeta" | "resultado">("monto")
  const [pagoResultado, setPagoResultado] = useState<MercadoPagoResult | null>(null)
  const [pagoError, setPagoError] = useState<string | null>(null)
  const brickControllerRef = useRef<any>(null)

  // Modal factura
  const [showFacturaModal, setShowFacturaModal] = useState(false)
  const [facturaFile, setFacturaFile] = useState<File | null>(null)
  const [escaneando, setEscaneando] = useState(false)
  const [facturaResult, setFacturaResult] = useState<FacturaEscaneada | null>(null)
  const [facturaMontoConfirmado, setFacturaMontoConfirmado] = useState("")
  const [enviandoFactura, setEnviandoFactura] = useState(false)

  // ─── Reset al abrir/cambiar de cuenta ───
  useEffect(() => {
    if (open) {
      setTab(initialTab)
      setMensajes([])
      setSharedKey(null)
      setChatReady(false)
      setRequestMode(null)
      setRequestAmount("")
      setRequestReason("")
    }
  }, [open, cuentaId, initialTab])

  // ─── Cargar transacciones ───
  const fetchTransacciones = useCallback(async () => {
    if (!cuentaId) return
    setLoadingTx(true)
    try {
      const data = await apiFetch<Transaccion[]>(
        `/cuentas-corrientes/${cuentaId}/transacciones`,
      )
      setTransacciones(data)
    } catch {
      // silent
    } finally {
      setLoadingTx(false)
    }
  }, [cuentaId])

  // ─── Setup E2EE ───
  const setupEncryption = useCallback(async () => {
    if (!userId || !cuentaId) return
    try {
      let pubB64: string
      let privB64: string

      const stored = getStoredKeyPair(cuentaId)
      if (stored) {
        pubB64 = stored.pub
        privB64 = stored.priv
      } else {
        const keyPair = await generateKeyPair()
        pubB64 = await exportPublicKey(keyPair.publicKey)
        privB64 = await exportPrivateKey(keyPair.privateKey)
        storeKeyPair(cuentaId, pubB64, privB64)
      }

      await apiFetch(`/cuentas-corrientes/${cuentaId}/clave-publica`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clave_publica: pubB64 }),
      })

      const claves = await apiFetch<any[]>(
        `/cuentas-corrientes/${cuentaId}/claves-publicas`,
      )
      const otraClave = claves.find((c: any) => c.usuario_id !== userId)

      if (otraClave) {
        const myPrivateKey = await importPrivateKey(privB64)
        const otherPublicKey = await importPublicKey(otraClave.clave_publica)
        const derived = await deriveSharedKey(myPrivateKey, otherPublicKey)
        setSharedKey(derived)
        setChatReady(true)
      }
    } catch {
      // Key exchange incomplete
    }
  }, [userId, cuentaId])

  // ─── Cargar y descifrar mensajes ───
  const fetchAndDecryptMessages = useCallback(
    async (key: CryptoKey) => {
      try {
        const encrypted = await apiFetch<MensajeChat[]>(
          `/cuentas-corrientes/${cuentaId}/mensajes`,
        )
        const decrypted: MensajeDescifrado[] = await Promise.all(
          encrypted.map(async (m) => {
            try {
              const texto = await decryptMessage(key, m.texto_encriptado, m.iv)
              return { id: m.id, remitente_id: m.remitente_id, texto, created_at: m.created_at }
            } catch {
              return {
                id: m.id,
                remitente_id: m.remitente_id,
                texto: "[No se pudo descifrar]",
                created_at: m.created_at,
              }
            }
          }),
        )
        setMensajes(decrypted)
      } catch {
        // silent
      }
    },
    [cuentaId],
  )

  useEffect(() => {
    if (open && cuentaId) fetchTransacciones()
  }, [open, cuentaId, fetchTransacciones])

  useEffect(() => {
    if (open && tab === "chat") setupEncryption()
  }, [open, tab, setupEncryption])

  useEffect(() => {
    if (sharedKey && chatReady) fetchAndDecryptMessages(sharedKey)
  }, [sharedKey, chatReady, fetchAndDecryptMessages])

  // ─── Supabase Realtime para chat ───
  useEffect(() => {
    if (!open || !chatReady || !sharedKey) return

    const supabase = createSupabaseBrowserClient()
    const channel = supabase
      .channel(`chat:${cuentaId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensajes_chat",
          filter: `cuenta_corriente_id=eq.${cuentaId}`,
        },
        async (payload) => {
          const msg = payload.new as MensajeChat
          try {
            const texto = await decryptMessage(sharedKey, msg.texto_encriptado, msg.iv)
            setMensajes((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev
              return [...prev, { id: msg.id, remitente_id: msg.remitente_id, texto, created_at: msg.created_at }]
            })
          } catch {
            // Can't decrypt
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [open, cuentaId, chatReady, sharedKey])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [mensajes])

  // ─── Enviar mensaje ───
  async function handleSendChat(e: FormEvent) {
    e.preventDefault()
    if (!chatInput.trim() || !sharedKey) return
    setSendingChat(true)
    try {
      const { ciphertext, iv } = await encryptMessage(sharedKey, chatInput.trim())
      await apiFetch(`/cuentas-corrientes/${cuentaId}/mensajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto_encriptado: ciphertext, iv }),
      })
      setChatInput("")
    } catch {
      // silent
    } finally {
      setSendingChat(false)
    }
  }

  // ─── Abrir modales desde el menú del chat ───
  function abrirPago() {
    setPagoMonto("")
    setPagoDesc("")
    setPagoStep("monto")
    setPagoError(null)
    setPagoResultado(null)
    setShowPagoModal(true)
  }

  function abrirFactura() {
    setFacturaFile(null)
    setFacturaResult(null)
    setFacturaMontoConfirmado("")
    setShowFacturaModal(true)
  }

  function abrirSolicitud(mode: "reembolso" | "cobro") {
    setRequestMode(mode)
    setRequestAmount("")
    setRequestReason("")
  }

  // ─── Enviar solicitud (reembolso / cobro) como mensaje cifrado ───
  async function handleSendRequest(e: FormEvent) {
    e.preventDefault()
    if (!requestAmount || !sharedKey || !requestMode) return
    setSendingRequest(true)
    try {
      const label =
        requestMode === "reembolso" ? "Solicitud de reembolso" : "Solicitud de pago"
      const monto = formatSaldo(parseFloat(requestAmount))
      const motivo = requestReason.trim() ? ` — Motivo: ${requestReason.trim()}` : ""
      const texto = `${label}: ${monto}${motivo}`

      const { ciphertext, iv } = await encryptMessage(sharedKey, texto)
      await apiFetch(`/cuentas-corrientes/${cuentaId}/mensajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto_encriptado: ciphertext, iv }),
      })
      setRequestMode(null)
      setRequestAmount("")
      setRequestReason("")
    } catch {
      // silent
    } finally {
      setSendingRequest(false)
    }
  }

  // ─── Iniciar flujo Payment Brick ───
  async function initPaymentBrick(amount: number) {
    if (!MP_PUBLIC_KEY) {
      setPagoError("Falta configurar NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY")
      return
    }
    try {
      const { loadMercadoPago } = await import("@mercadopago/sdk-js")
      await loadMercadoPago()
      const mp = new (window as any).MercadoPago(MP_PUBLIC_KEY, { locale: "es-AR" })
      const bricksBuilder = mp.bricks()

      brickControllerRef.current = await bricksBuilder.create(
        "cardPayment",
        "mp-card-brick",
        {
          initialization: { amount },
          customization: {
            visual: { style: { theme: "default" }, texts: { formSubmit: "Pagar" } },
          },
          callbacks: {
            onSubmit: async (cardFormData: any) => {
              setPagando(true)
              setPagoError(null)
              try {
                const result = await apiFetch<MercadoPagoResult>(
                  `/cuentas-corrientes/${cuentaId}/mercado-pago`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      token: cardFormData.token,
                      payment_method_id: cardFormData.payment_method_id,
                      transaction_amount: cardFormData.transaction_amount,
                      installments: cardFormData.installments,
                      issuer_id: cardFormData.issuer_id ? String(cardFormData.issuer_id) : undefined,
                      payer_email: cardFormData.payer?.email ?? "",
                      payer_identification_type: cardFormData.payer?.identification?.type,
                      payer_identification_number: cardFormData.payer?.identification?.number,
                      receptor_id: cuenta!.contraparte.id,
                      descripcion: pagoDesc || undefined,
                    }),
                  },
                )
                setPagoResultado(result)
                setPagoStep("resultado")
                fetchTransacciones()
                onChanged?.()
              } catch (err: any) {
                setPagoError(err.message)
              } finally {
                setPagando(false)
              }
            },
            onReady: () => {},
            onError: (error: any) => {
              console.error("MP Brick error:", error)
            },
          },
        },
      )
    } catch (err: any) {
      setPagoError(`Error al cargar Mercado Pago: ${err.message}`)
    }
  }

  function handleContinuarAlPago(e: FormEvent) {
    e.preventDefault()
    if (!pagoMonto) return
    setPagoStep("tarjeta")
    setPagoError(null)
    setTimeout(() => initPaymentBrick(parseFloat(pagoMonto)), 100)
  }

  function handlePagarFactura(tx: Transaccion) {
    if (!cuenta) return
    setPagoMonto(String(tx.monto))
    setPagoDesc(`Pago factura - ${tx.descripcion || ""}`)
    setPagoStep("tarjeta")
    setPagoError(null)
    setPagoResultado(null)
    setShowPagoModal(true)
    setTimeout(() => initPaymentBrick(tx.monto), 200)
  }

  function closePagoModal() {
    brickControllerRef.current?.unmount?.()
    brickControllerRef.current = null
    setShowPagoModal(false)
    setPagoStep("monto")
    setPagoMonto("")
    setPagoDesc("")
    setPagoError(null)
    setPagoResultado(null)
  }

  // ─── Escanear factura ───
  async function handleEscanearFactura() {
    if (!facturaFile) return
    setEscaneando(true)
    setFacturaResult(null)
    try {
      const formData = new FormData()
      formData.append("factura", facturaFile)
      const token = getToken()
      const res = await fetch(
        `${BACKEND_URL}/cuentas-corrientes/${cuentaId}/escanear-factura`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        },
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Error" }))
        throw new Error(body.message)
      }
      const result: FacturaEscaneada = await res.json()
      setFacturaResult(result)
      if (result.monto_total) setFacturaMontoConfirmado(result.monto_total.toString())
    } catch (err: any) {
      setPagoError(null)
      alert(err.message)
    } finally {
      setEscaneando(false)
    }
  }

  // ─── Enviar factura como transacción ───
  async function handleEnviarFactura(e: FormEvent) {
    e.preventDefault()
    if (!cuenta || !facturaMontoConfirmado) return
    setEnviandoFactura(true)
    try {
      await apiFetch(`/cuentas-corrientes/${cuentaId}/transaccion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto: parseFloat(facturaMontoConfirmado),
          tipo: "FACTURA",
          receptor_id: cuenta.contraparte.id,
          descripcion: "Factura escaneada",
          url_factura: facturaResult?.url_factura ?? undefined,
        }),
      })
      setShowFacturaModal(false)
      setFacturaFile(null)
      setFacturaResult(null)
      setFacturaMontoConfirmado("")
      fetchTransacciones()
      onChanged?.()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setEnviandoFactura(false)
    }
  }

  if (!open || !cuenta) return null

  const nombre = cuenta.contraparte.nombre || cuenta.contraparte.email
  const saldoPositivo = cuenta.saldo_relativo > 0
  const saldoNegativo = cuenta.saldo_relativo < 0

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)} />

      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-background shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border p-4">
          <Avatar nombre={nombre} positive={saldoPositivo} negative={saldoNegativo} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold">{nombre}</h2>
            <p className="text-xs text-muted-foreground">DNI/CUIT: {cuenta.contraparte.dni || "—"}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Balance */}
        <div className="px-4 pt-4">
          <div
            className={`rounded-xl border p-4 ${
              saldoPositivo
                ? "border-success/20 bg-success/5"
                : saldoNegativo
                ? "border-destructive/20 bg-destructive/5"
                : "border-border bg-muted/30"
            }`}
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Balance</p>
            <div className="mt-0.5 flex items-center gap-2">
              <p
                className={`text-2xl font-bold tabular-nums ${
                  saldoPositivo ? "text-success" : saldoNegativo ? "text-destructive" : "text-foreground"
                }`}
              >
                {formatSaldo(cuenta.saldo_relativo)}
              </p>
              {saldoPositivo && <TrendingUp className="h-4 w-4 text-success" />}
              {saldoNegativo && <TrendingDown className="h-4 w-4 text-destructive" />}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {saldoPositivo ? "Te debe" : saldoNegativo ? "Le debés" : "Sin saldo pendiente"}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as "historial" | "chat")} className="flex min-h-0 flex-1 flex-col px-4 pt-4">
          <TabsList className="grid w-full grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            <TabsTrigger value="historial" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              Historial
            </TabsTrigger>
            <TabsTrigger value="chat" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <MessageCircle className="mr-2 h-4 w-4" />
              Chat
            </TabsTrigger>
          </TabsList>

          {/* Historial */}
          <TabsContent value="historial" className="mt-4 min-h-0 flex-1 overflow-y-auto pb-4">
            {loadingTx ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : transacciones.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No hay transacciones aún.</p>
            ) : (
              <div className="space-y-3">
                {transacciones.map((tx) => {
                  const esEmisor = tx.emisor_id === userId
                  const esPago = tx.tipo === "PAGO"
                  const pendiente = tx.estado === "PENDIENTE"
                  const puedePagar = tx.tipo === "FACTURA" && pendiente && tx.receptor_id === userId

                  return (
                    <div key={tx.id} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-full ${
                              esPago ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                            }`}
                          >
                            {esPago ? <CreditCard className="h-4 w-4" /> : <FileUp className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              {esPago ? "Pago" : "Factura"}
                              {tx.descripcion && <span className="ml-1 text-muted-foreground">· {tx.descripcion}</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(tx.created_at)} · {esEmisor ? "Enviado" : "Recibido"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold tabular-nums ${esPago ? "text-success" : "text-warning"}`}>
                            {formatSaldo(tx.monto)}
                          </p>
                          <Badge
                            variant="secondary"
                            className={`mt-0.5 text-[10px] ${
                              pendiente ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                            }`}
                          >
                            {pendiente ? <Clock className="mr-1 h-3 w-3" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
                            {tx.estado}
                          </Badge>
                        </div>
                      </div>
                      {puedePagar && (
                        <Button onClick={() => handlePagarFactura(tx)} className="mt-3 w-full" size="sm">
                          <CreditCard className="mr-2 h-4 w-4" />
                          Pagar con Mercado Pago
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Chat */}
          <TabsContent value="chat" className="mt-4 flex min-h-0 flex-1 flex-col pb-4">
            <div className="mb-3 flex items-center justify-center gap-1.5 rounded-lg bg-success/10 px-3 py-2">
              <Lock className="h-3.5 w-3.5 text-success" />
              <span className="text-xs font-medium text-success">Encriptado de extremo a extremo</span>
            </div>

            {/* Mensajes */}
            <div className="mb-3 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl border border-border bg-muted/20 p-3">
              {!chatReady ? (
                <div className="py-12 text-center">
                  <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Estableciendo canal seguro...</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Se necesita que ambos usuarios abran el chat al menos una vez.
                  </p>
                </div>
              ) : mensajes.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No hay mensajes aún. Iniciá la conversación.
                </p>
              ) : (
                mensajes.map((m) => {
                  const esMio = m.remitente_id === userId
                  const esReembolso = m.texto.startsWith("Solicitud de reembolso")
                  const esCobro = m.texto.startsWith("Solicitud de pago")
                  const esSolicitud = esReembolso || esCobro
                  return (
                    <div key={m.id} className={`flex ${esMio ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                          esSolicitud
                            ? "border border-amber-500/30 bg-amber-500/10 text-foreground"
                            : esMio
                            ? "rounded-br-md bg-primary text-primary-foreground"
                            : "rounded-bl-md bg-muted text-foreground"
                        }`}
                      >
                        {esSolicitud && (
                          <div className="mb-1 flex items-center gap-1">
                            {esReembolso ? (
                              <RotateCcw className="h-3 w-3 text-amber-600" />
                            ) : (
                              <DollarSign className="h-3 w-3 text-amber-600" />
                            )}
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                              {esReembolso ? "Reembolso" : "Solicitud de pago"}
                            </span>
                          </div>
                        )}
                        <p className="text-sm leading-relaxed">{m.texto}</p>
                        <p
                          className={`mt-1 text-[10px] ${
                            esSolicitud
                              ? "text-muted-foreground"
                              : esMio
                              ? "text-primary-foreground/60"
                              : "text-muted-foreground"
                          }`}
                        >
                          {new Date(m.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Panel de solicitud (reembolso / cobro) */}
            {requestMode && (
              <form onSubmit={handleSendRequest} className="mb-3 space-y-2 rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {requestMode === "reembolso" ? (
                      <RotateCcw className="h-4 w-4 text-amber-600" />
                    ) : (
                      <DollarSign className="h-4 w-4 text-amber-600" />
                    )}
                    {requestMode === "reembolso" ? "Solicitar reembolso" : "Solicitar pago"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setRequestMode(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={requestAmount}
                  onChange={(e) => setRequestAmount(e.target.value)}
                  placeholder="Monto (ARS)"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  type="text"
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Motivo (opcional)"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <Button type="submit" className="w-full" size="sm" disabled={sendingRequest || !requestAmount}>
                  {sendingRequest ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Enviar solicitud
                </Button>
              </form>
            )}

            {/* Fila de entrada: menú de acciones + mensaje */}
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-auto shrink-0 rounded-xl px-3">
                    <Plus className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top">
                  <DropdownMenuItem onClick={abrirPago}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Realizar pago
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={abrirFactura}>
                    <FileUp className="mr-2 h-4 w-4" />
                    Subir factura
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={!chatReady} onClick={() => abrirSolicitud("reembolso")}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Solicitar reembolso
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={!chatReady} onClick={() => abrirSolicitud("cobro")}>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Solicitar pago
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <form onSubmit={handleSendChat} className="flex flex-1 gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={chatReady ? "Escribí un mensaje..." : "Estableciendo canal seguro..."}
                  disabled={!chatReady}
                  className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition focus:border-primary disabled:opacity-60"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={sendingChat || !chatInput.trim() || !chatReady}
                  className="h-auto rounded-xl px-4"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Modal: Realizar Pago ─── */}
      {showPagoModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closePagoModal} />
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-background p-6 shadow-2xl sm:rounded-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">{pagoStep === "resultado" ? "Resultado del pago" : "Realizar pago"}</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closePagoModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {pagoError && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {pagoError}
              </div>
            )}

            {pagoStep === "monto" && (
              <form onSubmit={handleContinuarAlPago} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Monto (ARS)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={pagoMonto}
                    onChange={(e) => setPagoMonto(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Descripción (opcional)</label>
                  <input
                    type="text"
                    value={pagoDesc}
                    onChange={(e) => setPagoDesc(e.target.value)}
                    placeholder="Motivo del pago"
                    className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
                <Button type="submit" disabled={!pagoMonto} className="w-full">
                  Continuar al pago
                </Button>
              </form>
            )}

            {pagoStep === "tarjeta" && (
              <div>
                <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Monto a pagar</p>
                  <p className="text-xl font-bold text-primary">{formatSaldo(parseFloat(pagoMonto || "0"))}</p>
                </div>

                {pagando && (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm text-muted-foreground">Procesando pago...</span>
                  </div>
                )}

                <div id="mp-card-brick" />

                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={() => {
                    brickControllerRef.current?.unmount?.()
                    brickControllerRef.current = null
                    setPagoStep("monto")
                  }}
                >
                  Volver
                </Button>
              </div>
            )}

            {pagoStep === "resultado" && pagoResultado && (
              <div className="space-y-4">
                <div
                  className={`rounded-xl p-6 text-center ${
                    pagoResultado.status === "approved"
                      ? "bg-success/10"
                      : pagoResultado.status === "pending" || pagoResultado.status === "in_process"
                      ? "bg-warning/10"
                      : "bg-destructive/10"
                  }`}
                >
                  {pagoResultado.status === "approved" ? (
                    <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-success" />
                  ) : (
                    <AlertCircle
                      className={`mx-auto mb-3 h-12 w-12 ${
                        pagoResultado.status === "pending" || pagoResultado.status === "in_process"
                          ? "text-warning"
                          : "text-destructive"
                      }`}
                    />
                  )}
                  <p
                    className={`text-lg font-bold ${
                      pagoResultado.status === "approved"
                        ? "text-success"
                        : pagoResultado.status === "pending" || pagoResultado.status === "in_process"
                        ? "text-warning"
                        : "text-destructive"
                    }`}
                  >
                    {pagoResultado.status === "approved"
                      ? "Pago aprobado"
                      : pagoResultado.status === "pending" || pagoResultado.status === "in_process"
                      ? "Pago pendiente"
                      : "Pago rechazado"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{pagoResultado.status_detail}</p>
                </div>
                <Button onClick={closePagoModal} className="w-full">
                  Cerrar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Modal: Subir Factura ─── */}
      {showFacturaModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFacturaModal(false)} />
          <div className="relative w-full max-w-md rounded-t-2xl border border-border bg-background p-6 shadow-2xl sm:rounded-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">Subir factura</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowFacturaModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {!facturaResult && (
              <div className="space-y-4">
                <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border p-8 transition hover:border-primary/50 hover:bg-muted/30">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium">{facturaFile ? facturaFile.name : "Seleccionar archivo"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">PDF (máx. 10MB)</p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => setFacturaFile(e.target.files?.[0] ?? null)}
                  />
                </label>

                <Button onClick={handleEscanearFactura} disabled={!facturaFile || escaneando} className="w-full">
                  {escaneando ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analizando factura...
                    </>
                  ) : (
                    "Escanear factura"
                  )}
                </Button>
              </div>
            )}

            {facturaResult && (
              <form onSubmit={handleEnviarFactura} className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Monto detectado</p>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        facturaResult.confianza === "alta"
                          ? "bg-success/10 text-success"
                          : facturaResult.confianza === "media"
                          ? "bg-warning/10 text-warning"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      Confianza {facturaResult.confianza}
                    </Badge>
                  </div>
                  {facturaResult.monto_total ? (
                    <p className="mt-1 text-2xl font-bold text-primary">{formatSaldo(facturaResult.monto_total)}</p>
                  ) : (
                    <p className="mt-1 text-sm text-destructive">No se pudo detectar el monto automáticamente.</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">Monto a enviar (ARS)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={facturaMontoConfirmado}
                    onChange={(e) => setFacturaMontoConfirmado(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setFacturaResult(null)
                      setFacturaFile(null)
                    }}
                  >
                    Reintentar
                  </Button>
                  <Button type="submit" disabled={enviandoFactura || !facturaMontoConfirmado} className="flex-1">
                    {enviandoFactura ? "Enviando..." : "Confirmar y enviar"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Avatar({ nombre, positive, negative }: { nombre: string; positive: boolean; negative: boolean }) {
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
        positive ? "bg-success/10 text-success" : negative ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
      }`}
    >
      {nombre.charAt(0).toUpperCase()}
    </div>
  )
}
