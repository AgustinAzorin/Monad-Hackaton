export interface Profile {
  id: string;
  email: string;
  dni: string;
  nombre: string | null;
}

export interface CuentaCorriente {
  id: string;
  usuario_a_id: string;
  usuario_b_id: string;
  saldo: number;
  created_at: string;
  updated_at: string;
}

export interface CuentaCorrienteConPerfil extends CuentaCorriente {
  contraparte: Profile;
  saldo_relativo: number;
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
  created_at: string;
  updated_at: string;
}

export interface TransaccionConDetalle extends Transaccion {
  contraparte: Profile;
  // 'HACIA_MI': soy el receptor; 'POR_MI': soy el emisor
  direccion: 'HACIA_MI' | 'POR_MI';
  // URL firmada y temporal para abrir el PDF de la factura (si existe)
  factura_url: string | null;
}

export interface MensajeChat {
  id: string;
  cuenta_corriente_id: string;
  remitente_id: string;
  texto_encriptado: string;
  iv: string;
  created_at: string;
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
  // Path del PDF ya almacenado en el bucket 'facturas' (para adjuntar a la transacción)
  url_factura: string | null;
}

// ─── OCR de hojas físicas → Factura generada ───

export interface ConceptoFactura {
  descripcion: string;
  monto: number | null;
}

export interface DatosFacturaOcr {
  monto_total: number | null;
  conceptos: ConceptoFactura[];
  observaciones: string;
  confianza: 'alta' | 'media' | 'baja';
}

export interface FacturaOcrGenerada {
  // Transacción registrada como PENDIENTE en la cuenta corriente.
  transaccion: Transaccion;
  // URL firmada y temporal del PDF de la factura generada.
  factura_url: string | null;
  // Datos estructurados que se extrajeron de la imagen por OCR.
  datos_extraidos: DatosFacturaOcr;
  // Texto plano completo que devolvió Tesseract (recortado).
  texto_crudo: string;
}
