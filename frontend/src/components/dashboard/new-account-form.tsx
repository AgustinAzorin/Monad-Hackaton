"use client"

import { X } from "lucide-react"
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

interface NewAccountFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewAccountForm({ open, onOpenChange }: NewAccountFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onOpenChange(false)
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
            <Select>
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
            <Input id="name" placeholder="Ej: Empresa ABC S.A." required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cuit">CUIT</Label>
              <Input id="cuit" placeholder="30-12345678-9" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxCondition">Cond. IVA</Label>
              <Select>
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
            <Input id="email" type="email" placeholder="contacto@empresa.com" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefono</Label>
              <Input id="phone" placeholder="+54 11 1234-5678" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact">Contacto</Label>
              <Input id="contact" placeholder="Nombre del contacto" />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Direccion</Label>
            <Input id="address" placeholder="Calle 123, Ciudad" />
          </div>

          {/* Bank Details */}
          <Card className="p-4 space-y-3 bg-muted/30">
            <h4 className="font-medium text-sm">Datos bancarios</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="bank">Banco</Label>
                <Input id="bank" placeholder="Ej: Banco Nacion" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountType">Tipo de cuenta</Label>
                <Select>
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
              <Input id="cbu" placeholder="0110012340012345678901" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alias">Alias</Label>
              <Input id="alias" placeholder="MI.ALIAS.BANCO" />
            </div>
          </Card>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Guardar cuenta
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
