"use client"

import { useState } from "react"
import { X, Loader2 } from "lucide-react"
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
import { Card } from "@/components/ui/card"
import { apiFetch } from "@/lib/api"
import type { CuentaBancaria, TipoCuentaBancaria } from "@/types/cuenta"

interface NewAccountFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

interface FormState {
  tipo: TipoCuentaBancaria | ""
  nombre: string
  cuit: string
  condicion_iva: string
  email: string
  telefono: string
  contacto: string
  direccion: string
  banco: string
  tipo_cuenta: string
  cbu: string
  alias: string
}

const EMPTY: FormState = {
  tipo: "",
  nombre: "",
  cuit: "",
  condicion_iva: "",
  email: "",
  telefono: "",
  contacto: "",
  direccion: "",
  banco: "",
  tipo_cuenta: "",
  cbu: "",
  alias: "",
}

export function NewAccountForm({ open, onOpenChange, onSaved }: NewAccountFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) {
      setError("El nombre / razón social es obligatorio.")
      return
    }

    setSubmitting(true)
    setError(null)

    // Sólo enviamos los campos con valor (el backend valida email y demás).
    const payload: Record<string, string> = {}
    for (const [key, value] of Object.entries(form)) {
      if (value && value.trim()) payload[key] = value.trim()
    }

    try {
      await apiFetch<CuentaBancaria>("/accounts", {
        method: "POST",
        body: JSON.stringify(payload),
      })
      setForm(EMPTY)
      onSaved?.()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la cuenta.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 pb-0 sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">Nueva Cuenta</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-4 space-y-5">
          {/* Account Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo de cuenta</Label>
            <Select value={form.tipo} onValueChange={(v) => set("tipo", v)}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Cliente</SelectItem>
                <SelectItem value="supplier">Proveedor</SelectItem>
                <SelectItem value="employee">Empleado</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Basic Info */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre / Razon social</Label>
            <Input
              id="name"
              placeholder="Ej: Empresa ABC S.A."
              value={form.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cuit">CUIT</Label>
              <Input
                id="cuit"
                placeholder="30-12345678-9"
                value={form.cuit}
                onChange={(e) => set("cuit", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxCondition">Cond. IVA</Label>
              <Select value={form.condicion_iva} onValueChange={(v) => set("condicion_iva", v)}>
                <SelectTrigger id="taxCondition">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ri">Resp. Inscripto</SelectItem>
                  <SelectItem value="mono">Monotributista</SelectItem>
                  <SelectItem value="exento">Exento</SelectItem>
                  <SelectItem value="cf">Cons. Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="contacto@empresa.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefono</Label>
              <Input
                id="phone"
                placeholder="+54 11 1234-5678"
                value={form.telefono}
                onChange={(e) => set("telefono", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">Contacto</Label>
              <Input
                id="contact"
                placeholder="Nombre del contacto"
                value={form.contacto}
                onChange={(e) => set("contacto", e.target.value)}
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Direccion</Label>
            <Input
              id="address"
              placeholder="Calle 123, Ciudad"
              value={form.direccion}
              onChange={(e) => set("direccion", e.target.value)}
            />
          </div>

          {/* Bank Details */}
          <Card className="p-4 space-y-3 bg-muted/30">
            <h4 className="font-medium text-sm">Datos bancarios</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="bank">Banco</Label>
                <Input
                  id="bank"
                  placeholder="Ej: Banco Nacion"
                  value={form.banco}
                  onChange={(e) => set("banco", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountType">Tipo de cuenta</Label>
                <Select value={form.tipo_cuenta} onValueChange={(v) => set("tipo_cuenta", v)}>
                  <SelectTrigger id="accountType">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cc">Cuenta Corriente</SelectItem>
                    <SelectItem value="ca">Caja de Ahorro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cbu">CBU</Label>
              <Input
                id="cbu"
                placeholder="0110012340012345678901"
                value={form.cbu}
                onChange={(e) => set("cbu", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alias">Alias</Label>
              <Input
                id="alias"
                placeholder="MI.ALIAS.BANCO"
                value={form.alias}
                onChange={(e) => set("alias", e.target.value)}
              />
            </div>
          </Card>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar cuenta
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
