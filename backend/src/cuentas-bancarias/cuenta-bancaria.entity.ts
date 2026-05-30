export type TipoCuentaBancaria = 'client' | 'supplier' | 'employee' | 'other';

export interface CuentaBancaria {
  id: string;
  usuario_id: string;
  tipo: TipoCuentaBancaria;
  nombre: string;
  cuit: string | null;
  condicion_iva: string | null;
  email: string | null;
  telefono: string | null;
  contacto: string | null;
  direccion: string | null;
  banco: string | null;
  tipo_cuenta: string | null;
  cbu: string | null;
  alias: string | null;
  created_at: string;
  updated_at: string;
}
