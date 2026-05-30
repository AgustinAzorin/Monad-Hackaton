"use client"

import { useEffect, useState } from "react"
import { Upload, Plus, Trash2, FileText, Receipt, Package, CreditCard, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { apiFetch } from "@/lib/api"
import type { CuentaCorriente, Categoria, MetodoPago, Transaccion } from "@/types/cuenta"

interface Document {
  id: string
  type: "factura" | "comprobante" | "remito" | "orden_compra" | "otro"
  number: string
  file?: File
}

interface NewTransactionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cuentas?: CuentaCorriente[]
  onSaved?: () => void
}

const documentTypes = [
  { value: "factura", label: "Factura", icon: FileText },
  { value: "comprobante", label: "Comprobante", icon: Receipt },
  { value: "remito", label: "Remito", icon: Package },
  { value: "orden_compra", label: "Orden de Compra", icon: CreditCard },
  { value: "otro", label: "Otro", icon: FileText },
]

export function NewTransactionForm({ open, onOpenChange, cuentas = [], onSaved }: NewTransactionFormProps) {
  const [documents, setDocuments] = useState<Document[]>([])

  // Catálogos desde el backend
  const [categories, setCategories] = useState<Categoria[]>([])
  const [paymentMethods, setPaymentMethods] = useState<MetodoPago[]>([])

  // Campos del formulario
  const [cuentaId, setCuentaId] = useState("")
  const [monto, setMonto] = useState("")
  const [tipo, setTipo] = useState<"FACTURA" | "PAGO">("FACTURA")
  const [categoriaSlug, setCategoriaSlug] = useState("")
  const [metodoSlug, setMetodoSlug] = useState("")
  const [notas, setNotas] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargamos los catálogos la primera vez que se abre el diálogo.
  useEffect(() => {
    if (!open) return
    if (categories.length === 0) {
      apiFetch<Categoria[]>("/categories").then(setCategories).catch(() => {})
    }
    if (paymentMethods.length === 0) {
      apiFetch<MetodoPago[]>("/payment-methods").then(setPaymentMethods).catch(() => {})
    }
  }, [open, categories.length, paymentMethods.length])

  const resetForm = () => {
    setCuentaId("")
    setMonto("")
    setTipo("FACTURA")
    setCategoriaSlug("")
    setMetodoSlug("")
    setNotas("")
    setDocuments([])
  }

  const addDocument = () => {
    setDocuments([
      ...documents,
      { id: crypto.randomUUID(), type: "factura", number: "" },
    ])
  }

  const removeDocument = (id: string) => {
    setDocuments(documents.filter((doc) => doc.id !== id))
  }

  const updateDocument = (id: string, updates: Partial<Document>) => {
    setDocuments(
      documents.map((doc) => (doc.id === id ? { ...doc, ...updates } : doc))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const cuenta = cuentas.find((c) => c.id === cuentaId)
    if (!cuenta) {
      setError("Seleccioná una cuenta.")
      return
    }
    const montoNum = Number(monto)
    if (!montoNum || montoNum <= 0) {
      setError("Ingresá un monto válido.")
      return
    }

    setSubmitting(true)
    try {
      await apiFetch<Transaccion>(`/cuentas-corrientes/${cuenta.id}/transaccion`, {
        method: "POST",
        body: JSON.stringify({
          monto: montoNum,
          tipo,
          receptor_id: cuenta.contraparte.id,
          descripcion: notas.trim() || undefined,
          categoria_slug: categoriaSlug || undefined,
          metodo_pago_slug: metodoSlug || undefined,
        }),
      })
      resetForm()
      onSaved?.()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la transacción.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-3 sm:p-4 pb-0 sticky top-0 bg-background z-10">
          <DialogTitle className="text-base sm:text-lg font-semibold">Nueva Transaccion</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-4 sm:space-y-5">
          {/* Account Selection */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="account" className="text-xs sm:text-sm">Cuenta</Label>
            <Select value={cuentaId} onValueChange={setCuentaId}>
              <SelectTrigger id="account" className="h-9 sm:h-10 text-sm">
                <SelectValue placeholder="Seleccionar cuenta" />
              </SelectTrigger>
              <SelectContent>
                {cuentas.length > 0 ? (
                  cuentas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.contraparte?.nombre || c.contraparte?.email || "Contacto"}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="sin-cuentas" disabled>
                    No hay cuentas disponibles
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="tipo" className="text-xs sm:text-sm">Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as "FACTURA" | "PAGO")}>
              <SelectTrigger id="tipo" className="h-9 sm:h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FACTURA">Factura (registrar deuda)</SelectItem>
                <SelectItem value="PAGO">Pago (saldar)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="amount" className="text-xs sm:text-sm">Monto</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                className="pl-7 h-9 sm:h-10 text-sm"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Category and Payment Method */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="category" className="text-xs sm:text-sm">Categoria</Label>
              <Select value={categoriaSlug} onValueChange={setCategoriaSlug}>
                <SelectTrigger id="category" className="h-9 sm:h-10 text-sm">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.slug}>
                      {cat.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="method" className="text-xs sm:text-sm">Metodo de pago</Label>
              <Select value={metodoSlug} onValueChange={setMetodoSlug}>
                <SelectTrigger id="method" className="h-9 sm:h-10 text-sm">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.slug}>
                      {method.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="date" className="text-xs sm:text-sm">Fecha de operacion</Label>
            <Input id="date" type="date" className="h-9 sm:h-10 text-sm" />
          </div>

          {/* Bank Account Details */}
          <Card className="p-3 sm:p-4 space-y-2 sm:space-y-3 bg-muted/30">
            <h4 className="font-medium text-xs sm:text-sm">Datos bancarios</h4>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="bank" className="text-xs sm:text-sm">Banco</Label>
                <Input id="bank" placeholder="Ej: Banco Nacion" className="h-9 sm:h-10 text-sm" />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="accountTypeTx" className="text-xs sm:text-sm">Tipo de cuenta</Label>
                <Select>
                  <SelectTrigger id="accountTypeTx" className="h-9 sm:h-10 text-sm">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cc">Cuenta Corriente</SelectItem>
                    <SelectItem value="ca">Caja de Ahorro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="cbu" className="text-xs sm:text-sm">CBU / Alias</Label>
              <Input id="cbu" placeholder="Ej: 0110012340012345678901" className="h-9 sm:h-10 text-sm" />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="accountNumber" className="text-xs sm:text-sm">Numero de cuenta</Label>
              <Input id="accountNumber" placeholder="Ej: 123456789" className="h-9 sm:h-10 text-sm" />
            </div>
          </Card>

          {/* Documents Section */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs sm:text-sm">Documentacion</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDocument}
                className="h-7 sm:h-8 text-xs sm:text-sm"
              >
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                Agregar
              </Button>
            </div>

            {documents.length === 0 ? (
              <Card className="p-4 sm:p-6 border-dashed">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs sm:text-sm">No hay documentos agregados</p>
                  <p className="text-[10px] sm:text-xs mt-1">Agrega facturas, remitos, comprobantes, etc.</p>
                </div>
              </Card>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {documents.map((doc) => (
                  <Card key={doc.id} className="p-2 sm:p-3">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="flex-1 space-y-2 sm:space-y-3">
                        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                          <Select
                            value={doc.type}
                            onValueChange={(value: Document["type"]) =>
                              updateDocument(doc.id, { type: value })
                            }
                          >
                            <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {documentTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  <span className="flex items-center gap-2">
                                    <type.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    {type.label}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Numero"
                            value={doc.number}
                            onChange={(e) =>
                              updateDocument(doc.id, { number: e.target.value })
                            }
                            className="h-8 sm:h-9 text-xs sm:text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
                          >
                            <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                            Subir archivo
                          </Button>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive"
                        onClick={() => removeDocument(doc.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="notes" className="text-xs sm:text-sm">Notas adicionales</Label>
            <Textarea
              id="notes"
              placeholder="Observaciones, detalles del pago, etc."
              rows={3}
              className="text-sm resize-none"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          {/* Submit */}
          <div className="flex gap-2 sm:gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-9 sm:h-10 text-sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 h-9 sm:h-10 text-sm" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar transaccion
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
