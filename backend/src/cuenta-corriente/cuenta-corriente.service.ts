import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../config/supabase.service';
import {
  CuentaCorriente,
  CuentaCorrienteConPerfil,
  Profile,
  Transaccion,
  TransaccionConDetalle,
  MensajeChat,
  ClavePublica,
  FacturaEscaneada,
} from './cuenta-corriente.entity';
import { randomUUID } from 'crypto';
import { CreateCuentaCorrienteDto } from './dto/create-cuenta-corriente.dto';
import {
  CreateTransaccionDto,
  ProcesarPagoMPDto,
  CreateMensajeDto,
  UpsertClavePublicaDto,
} from './dto/create-transaccion.dto';
import { MercadoPagoConfig, Payment } from 'mercadopago';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

const FACTURAS_BUCKET = 'facturas';
const FACTURA_URL_TTL_SECONDS = 60 * 60; // 1 hora

@Injectable()
export class CuentaCorrienteService {
  private mpClient: InstanceType<typeof MercadoPagoConfig> | null = null;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    const mpToken = this.configService.get<string>('MERCADO_PAGO_ACCESS_TOKEN');
    if (mpToken) {
      this.mpClient = new MercadoPagoConfig({ accessToken: mpToken });
    }
  }

  private async getProfiles(ids: string[]): Promise<Map<string, Profile>> {
    if (ids.length === 0) return new Map();
    const supabase = this.supabaseService.getClient();
    const uniqueIds = [...new Set(ids)];

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, dni, nombre')
      .in('id', uniqueIds);

    if (error) {
      throw new BadRequestException(error.message);
    }

    const map = new Map<string, Profile>();
    for (const p of data ?? []) {
      map.set(p.id, p as Profile);
    }
    return map;
  }

  // Genera una URL firmada temporal para abrir el PDF de la factura guardado.
  private async signFacturaUrl(path: string | null): Promise<string | null> {
    if (!path) return null;
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase.storage
      .from(FACTURAS_BUCKET)
      .createSignedUrl(path, FACTURA_URL_TTL_SECONDS);
    if (error || !data) return null;
    return data.signedUrl;
  }

  async findByUsuario(usuarioId: string): Promise<CuentaCorrienteConPerfil[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('cuentas_corrientes')
      .select('*')
      .or(`usuario_a_id.eq.${usuarioId},usuario_b_id.eq.${usuarioId}`)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    const cuentas = (data ?? []) as CuentaCorriente[];

    const contraparteIds = cuentas.map((c) =>
      c.usuario_a_id === usuarioId ? c.usuario_b_id : c.usuario_a_id,
    );
    const profiles = await this.getProfiles(contraparteIds);

    return cuentas.map((c) => {
      const esA = c.usuario_a_id === usuarioId;
      const contraparteId = esA ? c.usuario_b_id : c.usuario_a_id;

      return {
        ...c,
        contraparte: profiles.get(contraparteId) ?? {
          id: contraparteId,
          email: '',
          dni: '',
          nombre: null,
        },
        saldo_relativo: esA ? c.saldo : -c.saldo,
      };
    });
  }

  async create(
    usuarioId: string,
    dto: CreateCuentaCorrienteDto,
  ): Promise<CuentaCorrienteConPerfil> {
    const supabase = this.supabaseService.getClient();
    const query = dto.searchQuery.trim();

    const isEmail = query.includes('@');
    const column = isEmail ? 'email' : 'dni';
    // El email se guarda siempre en minúsculas (Supabase Auth lo normaliza),
    // por lo que la búsqueda debe ser case-insensitive para no fallar por
    // diferencias de mayúsculas. El DNI se compara tal cual (ya viene trim).
    const value = isEmail ? query.toLowerCase() : query;

    const { data: target, error: lookupError } = await supabase
      .from('profiles')
      .select('id, email, dni, nombre')
      .eq(column, value)
      .maybeSingle();

    if (lookupError) {
      throw new BadRequestException(
        `Error al buscar el usuario: ${lookupError.message}`,
      );
    }

    if (!target) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (target.id === usuarioId) {
      throw new BadRequestException(
        'No podés crear una cuenta corriente con vos mismo',
      );
    }

    const [usuario_a_id, usuario_b_id] =
      usuarioId < target.id
        ? [usuarioId, target.id]
        : [target.id, usuarioId];

    const { data: existing } = await supabase
      .from('cuentas_corrientes')
      .select('id')
      .eq('usuario_a_id', usuario_a_id)
      .eq('usuario_b_id', usuario_b_id)
      .maybeSingle();

    if (existing) {
      throw new BadRequestException(
        'Ya existe una cuenta corriente con este usuario',
      );
    }

    const { data, error } = await supabase
      .from('cuentas_corrientes')
      .insert({ usuario_a_id, usuario_b_id })
      .select()
      .single();

    if (error) {
      if (
        error.message?.includes('duplicate') ||
        error.message?.includes('unique')
      ) {
        throw new BadRequestException(
          'Ya existe una cuenta corriente con este usuario',
        );
      }
      throw new BadRequestException(error.message);
    }

    const cuenta = data as CuentaCorriente;
    const esA = cuenta.usuario_a_id === usuarioId;

    return {
      ...cuenta,
      contraparte: target as Profile,
      saldo_relativo: esA ? cuenta.saldo : -cuenta.saldo,
    };
  }

  async findOne(
    id: string,
    usuarioId: string,
  ): Promise<CuentaCorrienteConPerfil> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('cuentas_corrientes')
      .select('*')
      .eq('id', id)
      .or(`usuario_a_id.eq.${usuarioId},usuario_b_id.eq.${usuarioId}`)
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    const cuenta = data as CuentaCorriente;
    const esA = cuenta.usuario_a_id === usuarioId;
    const contraparteId = esA ? cuenta.usuario_b_id : cuenta.usuario_a_id;

    const profiles = await this.getProfiles([contraparteId]);

    return {
      ...cuenta,
      contraparte: profiles.get(contraparteId) ?? {
        id: contraparteId,
        email: '',
        dni: '',
        nombre: null,
      },
      saldo_relativo: esA ? cuenta.saldo : -cuenta.saldo,
    };
  }

  private async assertUserInCuenta(
    cuentaId: string,
    usuarioId: string,
  ): Promise<CuentaCorriente> {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('cuentas_corrientes')
      .select('*')
      .eq('id', cuentaId)
      .or(`usuario_a_id.eq.${usuarioId},usuario_b_id.eq.${usuarioId}`)
      .single();

    if (error || !data) {
      throw new NotFoundException('Cuenta corriente no encontrada');
    }
    return data as CuentaCorriente;
  }

  // ─── Transacciones ───

  async crearTransaccion(
    cuentaId: string,
    usuarioId: string,
    dto: CreateTransaccionDto,
  ): Promise<Transaccion> {
    const cuenta = await this.assertUserInCuenta(cuentaId, usuarioId);
    const supabase = this.supabaseService.getClient();

    const otroId =
      cuenta.usuario_a_id === usuarioId
        ? cuenta.usuario_b_id
        : cuenta.usuario_a_id;

    if (dto.receptor_id !== otroId && dto.receptor_id !== usuarioId) {
      throw new ForbiddenException('Receptor inválido para esta cuenta');
    }

    const { data, error } = await supabase
      .from('transacciones')
      .insert({
        cuenta_corriente_id: cuentaId,
        monto: dto.monto,
        tipo: dto.tipo,
        emisor_id: usuarioId,
        receptor_id: dto.receptor_id,
        url_factura: dto.url_factura ?? null,
        descripcion: dto.descripcion ?? null,
        categoria_slug: dto.categoria_slug ?? null,
        metodo_pago_slug: dto.metodo_pago_slug ?? null,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    if (dto.tipo === 'PAGO') {
      await this.actualizarSaldo(cuentaId, cuenta, usuarioId, dto.monto);
      await supabase
        .from('transacciones')
        .update({ estado: 'COMPLETADO' })
        .eq('id', data.id);
      data.estado = 'COMPLETADO';
    }

    return data as Transaccion;
  }

  async listarTransacciones(
    cuentaId: string,
    usuarioId: string,
  ): Promise<Transaccion[]> {
    await this.assertUserInCuenta(cuentaId, usuarioId);
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('transacciones')
      .select('*')
      .eq('cuenta_corriente_id', cuentaId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return (data ?? []) as Transaccion[];
  }

  // Todas las transacciones del usuario (en todas sus cuentas corrientes),
  // enriquecidas con la contraparte, la dirección y la URL firmada de la factura.
  async listarMisTransacciones(
    usuarioId: string,
  ): Promise<TransaccionConDetalle[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('transacciones')
      .select('*')
      .or(`emisor_id.eq.${usuarioId},receptor_id.eq.${usuarioId}`)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    const transacciones = (data ?? []) as Transaccion[];

    const contraparteIds = transacciones.map((tx) =>
      tx.emisor_id === usuarioId ? tx.receptor_id : tx.emisor_id,
    );
    const profiles = await this.getProfiles(contraparteIds);

    return Promise.all(
      transacciones.map(async (tx) => {
        const soyReceptor = tx.receptor_id === usuarioId;
        const contraparteId = soyReceptor ? tx.emisor_id : tx.receptor_id;

        return {
          ...tx,
          contraparte: profiles.get(contraparteId) ?? {
            id: contraparteId,
            email: '',
            dni: '',
            nombre: null,
          },
          direccion: soyReceptor ? 'HACIA_MI' : 'POR_MI',
          factura_url: await this.signFacturaUrl(tx.url_factura),
        } as TransaccionConDetalle;
      }),
    );
  }

  private async actualizarSaldo(
    cuentaId: string,
    cuenta: CuentaCorriente,
    emisorId: string,
    monto: number,
  ): Promise<void> {
    const supabase = this.supabaseService.getClient();
    const esA = cuenta.usuario_a_id === emisorId;
    const nuevoSaldo = esA
      ? Number(cuenta.saldo) + monto
      : Number(cuenta.saldo) - monto;

    const { error } = await supabase
      .from('cuentas_corrientes')
      .update({ saldo: nuevoSaldo })
      .eq('id', cuentaId);

    if (error) throw new BadRequestException(error.message);
  }

  // ─── Mercado Pago (Checkout API + Payment) ───

  async procesarPagoMercadoPago(
    cuentaId: string,
    usuarioId: string,
    dto: ProcesarPagoMPDto,
  ) {
    const cuenta = await this.assertUserInCuenta(cuentaId, usuarioId);

    if (!this.mpClient) {
      throw new BadRequestException(
        'Mercado Pago no está configurado. Falta MERCADO_PAGO_ACCESS_TOKEN.',
      );
    }

    const supabase = this.supabaseService.getClient();

    const { data: tx, error: txError } = await supabase
      .from('transacciones')
      .insert({
        cuenta_corriente_id: cuentaId,
        monto: dto.transaction_amount,
        tipo: 'PAGO',
        estado: 'PENDIENTE',
        emisor_id: usuarioId,
        receptor_id: dto.receptor_id,
        descripcion: dto.descripcion ?? 'Pago vía Mercado Pago',
      })
      .select()
      .single();

    if (txError) throw new BadRequestException(txError.message);

    const backendUrl = this.configService.get<string>(
      'BACKEND_PUBLIC_URL',
      'http://localhost:3001',
    );

    const payment = new Payment(this.mpClient);

    const payerIdentification =
      dto.payer_identification_type && dto.payer_identification_number
        ? {
            type: dto.payer_identification_type,
            number: dto.payer_identification_number,
          }
        : undefined;

    const result = await payment.create({
      body: {
        transaction_amount: dto.transaction_amount,
        token: dto.token,
        description: dto.descripcion || 'Pago cuenta corriente',
        installments: dto.installments,
        payment_method_id: dto.payment_method_id,
        issuer_id: dto.issuer_id ? Number(dto.issuer_id) : undefined,
        payer: {
          email: dto.payer_email,
          identification: payerIdentification,
        },
        external_reference: tx.id,
        notification_url: `${backendUrl}/webhook/mercado-pago`,
      },
      requestOptions: {
        idempotencyKey: tx.id,
      },
    });

    const mpPaymentId = String(result.id);
    const status = result.status;

    if (status === 'approved') {
      await supabase
        .from('transacciones')
        .update({
          estado: 'COMPLETADO',
          mercado_pago_payment_id: mpPaymentId,
        })
        .eq('id', tx.id);

      await this.actualizarSaldo(cuentaId, cuenta, usuarioId, dto.transaction_amount);
    } else {
      await supabase
        .from('transacciones')
        .update({ mercado_pago_payment_id: mpPaymentId })
        .eq('id', tx.id);
    }

    return {
      status,
      status_detail: result.status_detail,
      payment_id: mpPaymentId,
      transaccion_id: tx.id,
    };
  }

  async procesarWebhookMercadoPago(paymentId: string): Promise<void> {
    if (!this.mpClient) return;

    const mpPayment = new Payment(this.mpClient);
    let result: any;
    try {
      result = await mpPayment.get({ id: paymentId });
    } catch {
      return;
    }

    if (result.status !== 'approved') return;

    const txId = result.external_reference;
    if (!txId) return;

    const supabase = this.supabaseService.getClient();

    const { data: tx } = await supabase
      .from('transacciones')
      .select('*')
      .eq('id', txId)
      .single();

    if (!tx || tx.estado === 'COMPLETADO') return;

    await supabase
      .from('transacciones')
      .update({
        estado: 'COMPLETADO',
        mercado_pago_payment_id: paymentId,
      })
      .eq('id', txId);

    const { data: cuenta } = await supabase
      .from('cuentas_corrientes')
      .select('*')
      .eq('id', tx.cuenta_corriente_id)
      .single();

    if (cuenta) {
      await this.actualizarSaldo(
        tx.cuenta_corriente_id,
        cuenta as CuentaCorriente,
        tx.emisor_id,
        Number(tx.monto),
      );
    }
  }

  // ─── Escaneo de Facturas ───

  async escanearFactura(
    cuentaId: string,
    file: Express.Multer.File,
  ): Promise<FacturaEscaneada> {
    let textoExtraido = '';

    if (file.mimetype === 'application/pdf') {
      const parsed = await pdfParse(file.buffer);
      textoExtraido = parsed.text;
    } else {
      throw new BadRequestException(
        'Formato no soportado. Subí un archivo PDF.',
      );
    }

    const montoTotal = this.extraerMontoTotal(textoExtraido);

    // Guardamos el PDF en el bucket privado para poder verlo luego desde el historial.
    const supabase = this.supabaseService.getClient();
    const path = `${cuentaId}/${randomUUID()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from(FACTURAS_BUCKET)
      .upload(path, file.buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    return {
      monto_total: montoTotal,
      texto_extraido: textoExtraido.substring(0, 2000),
      confianza: montoTotal ? 'alta' : 'baja',
      url_factura: uploadError ? null : path,
    };
  }

  private extraerMontoTotal(texto: string): number | null {
    const lines = texto.split('\n').map((l) => l.trim());

    const patterns = [
      /total\s*(?:a\s*pagar)?[\s:$]*\$?\s*([\d.,]+)/i,
      /importe\s*total[\s:$]*\$?\s*([\d.,]+)/i,
      /monto\s*total[\s:$]*\$?\s*([\d.,]+)/i,
      /total\s*final[\s:$]*\$?\s*([\d.,]+)/i,
      /gran\s*total[\s:$]*\$?\s*([\d.,]+)/i,
      /total[\s:$]*\$?\s*([\d.,]+)/i,
    ];

    for (const pattern of patterns) {
      for (let i = lines.length - 1; i >= 0; i--) {
        const match = lines[i].match(pattern);
        if (match) {
          return this.parseArgentineNumber(match[1]);
        }
      }
    }

    const allAmounts: number[] = [];
    const amountRegex = /\$\s*([\d.,]+)/g;
    let m: RegExpExecArray | null;
    while ((m = amountRegex.exec(texto)) !== null) {
      const val = this.parseArgentineNumber(m[1]);
      if (val && val > 0) allAmounts.push(val);
    }

    if (allAmounts.length > 0) {
      return Math.max(...allAmounts);
    }

    return null;
  }

  private parseArgentineNumber(str: string): number | null {
    let cleaned = str.trim();
    if (cleaned.includes(',') && cleaned.includes('.')) {
      const lastComma = cleaned.lastIndexOf(',');
      const lastDot = cleaned.lastIndexOf('.');
      if (lastComma > lastDot) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (cleaned.includes(',')) {
      const parts = cleaned.split(',');
      if (parts[parts.length - 1].length === 2) {
        cleaned = cleaned.replace(/,/g, '.');
      } else {
        cleaned = cleaned.replace(/,/g, '');
      }
    }
    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val;
  }

  // ─── Chat (E2EE) ───

  async guardarMensaje(
    cuentaId: string,
    usuarioId: string,
    dto: CreateMensajeDto,
  ): Promise<MensajeChat> {
    await this.assertUserInCuenta(cuentaId, usuarioId);
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('mensajes_chat')
      .insert({
        cuenta_corriente_id: cuentaId,
        remitente_id: usuarioId,
        texto_encriptado: dto.texto_encriptado,
        iv: dto.iv,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data as MensajeChat;
  }

  async listarMensajes(
    cuentaId: string,
    usuarioId: string,
  ): Promise<MensajeChat[]> {
    await this.assertUserInCuenta(cuentaId, usuarioId);
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('mensajes_chat')
      .select('*')
      .eq('cuenta_corriente_id', cuentaId)
      .order('created_at', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return (data ?? []) as MensajeChat[];
  }

  // ─── Claves Públicas (E2EE) ───

  async upsertClavePublica(
    cuentaId: string,
    usuarioId: string,
    dto: UpsertClavePublicaDto,
  ): Promise<ClavePublica> {
    await this.assertUserInCuenta(cuentaId, usuarioId);
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('claves_publicas')
      .upsert(
        {
          cuenta_corriente_id: cuentaId,
          usuario_id: usuarioId,
          clave_publica: dto.clave_publica,
        },
        { onConflict: 'cuenta_corriente_id,usuario_id' },
      )
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data as ClavePublica;
  }

  async obtenerClavesPublicas(
    cuentaId: string,
    usuarioId: string,
  ): Promise<ClavePublica[]> {
    await this.assertUserInCuenta(cuentaId, usuarioId);
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('claves_publicas')
      .select('*')
      .eq('cuenta_corriente_id', cuentaId);

    if (error) throw new BadRequestException(error.message);
    return (data ?? []) as ClavePublica[];
  }
}
