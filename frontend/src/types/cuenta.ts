export interface Profile {
  id: string;
  email: string;
  dni: string;
  nombre: string | null;
  wallet_address?: string | null;
}

// ─── Monad on-chain ───

export type EstadoOnchain =
  | 'NO_ANCLADA'
  | 'SIN_WALLET'
  | 'REGISTRADA'
  | 'CONFIRMADA'
  | 'PAGADA'
  | 'REEMBOLSO_SOLICITADO'
  | 'REEMBOLSADA'
  | 'ERROR';

export type TipoAccion = 'CONFIRMAR' | 'PAGAR' | 'REEMBOLSAR';

export interface AccionOnchain {
  id: string;
  transaccion_id: string;
  tipo_accion: TipoAccion;
  firma_emisor: string | null;
  firma_receptor: string | null;
  nonce: string;
  deadline: number;
  estado: 'PENDIENTE_FIRMAS' | 'LISTA' | 'ENVIADA' | 'CONFIRMADA' | 'FALLIDA';
  tx_hash: string | null;
  error_msg: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnchainResumen {
  estado_onchain: EstadoOnchain;
  anchor_tx_hash: string | null;
  factura_hash: string | null;
  mi_wallet_linked: boolean;
  contraparte_wallet_linked: boolean;
  accion_pendiente: AccionOnchain | null;
}

export interface CuentaCorriente {
  id: string;
  usuario_a_id: string;
  usuario_b_id: string;
  saldo: number;
  saldo_relativo: number;
  created_at: string;
  updated_at: string;
  contraparte: Profile;
}

export interface Transaccion {
  id: string;
  cuenta_corriente_id: string;
  monto: number;
  tipo: 'PAGO' | 'FACTURA';
  estado: 'PENDIENTE' | 'COMPLETADO';
  emisor_id: string;
  receptor_id: string;
  url_factura: string | null;
  descripcion: string | null;
  categoria_slug: string | null;
  metodo_pago_slug: string | null;
  mercado_pago_preference_id: string | null;
  mercado_pago_payment_id: string | null;
  factura_hash: string | null;
  anchor_tx_hash: string | null;
  estado_onchain: EstadoOnchain;
  created_at: string;
  updated_at: string;
}

export interface TransaccionConDetalle extends Transaccion {
  contraparte: Profile;
  direccion: 'HACIA_MI' | 'POR_MI';
  factura_url: string | null;
  onchain?: OnchainResumen;
}

export interface MensajeChat {
  id: string;
  cuenta_corriente_id: string;
  remitente_id: string;
  texto_encriptado: string;
  iv: string;
  created_at: string;
}

export interface MensajeDescifrado {
  id: string;
  remitente_id: string;
  texto: string;
  created_at: string;
  descifrando?: boolean;
}

export interface ClavePublica {
  id: string;
  cuenta_corriente_id: string;
  usuario_id: string;
  clave_publica: string;
  created_at: string;
}

export interface FacturaEscaneada {
  monto_total: number | null;
  texto_extraido: string;
  confianza: 'alta' | 'media' | 'baja';
  url_factura: string | null;
  factura_hash: string;
}

// Respuesta de iniciar una acción co-firmada.
export interface IniciarAccionResponse {
  accion: AccionOnchain;
}

export interface MercadoPagoResult {
  status: string;
  status_detail: string;
  payment_id: string;
  transaccion_id: string;
}

// ─── Catálogos ───

export interface Categoria {
  id: string;
  nombre: string;
  slug: string;
  icono: string;
  color: string;
  orden: number;
}

export interface MetodoPago {
  id: string;
  nombre: string;
  slug: string;
  orden: number;
  activo: boolean;
}

export interface CategoriaTransaccion {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  contact: string;
  status: 'paid' | 'pending';
  invoiceNumber?: string;
}

export interface CategoriaResumen {
  id: string;
  slug: string;
  name: string;
  icon: string;
  color: string;
  total: number;
  paid: number;
  transactions: CategoriaTransaccion[];
}

// ─── Cuentas bancarias / agenda ───

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
