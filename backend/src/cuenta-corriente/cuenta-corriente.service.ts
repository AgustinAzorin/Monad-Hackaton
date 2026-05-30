import {
  Injectable,
  Logger,
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
  AccionOnchain,
  OnchainResumen,
  TipoAccion,
} from './cuenta-corriente.entity';
import { randomUUID, createHash } from 'crypto';
import { keccak256, stringToHex } from 'viem';
import { CreateCuentaCorrienteDto } from './dto/create-cuenta-corriente.dto';
import {
  CreateTransaccionDto,
  ProcesarPagoMPDto,
  CreateMensajeDto,
  UpsertClavePublicaDto,
  IniciarAccionDto,
  FirmarAccionDto,
} from './dto/create-transaccion.dto';
import {
  BlockchainService,
  TipoOnchain,
} from '../blockchain/blockchain.service';
import { MercadoPagoConfig, Payment } from 'mercadopago';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

const FACTURAS_BUCKET = 'facturas';
const FACTURA_URL_TTL_SECONDS = 60 * 60; // 1 hora
const ZERO_BYTES32 = `0x${'0'.repeat(64)}` as const;
const ACTION_TTL_SECONDS = 24 * 60 * 60; // 24h

@Injectable()
export class CuentaCorrienteService {
  private readonly logger = new Logger(CuentaCorrienteService.name);
  private mpClient: InstanceType<typeof MercadoPagoConfig> | null = null;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly blockchain: BlockchainService,
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
      .select('id, email, dni, nombre, wallet_address')
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
        factura_hash: dto.factura_hash ?? null,
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

    // #1 + #4: anclaje on-chain fire-and-forget — nunca debe romper la creación.
    void this.anclarEnCadena(data as Transaccion).catch((err) =>
      this.logger.warn(
        `Anclaje on-chain falló tx=${data.id}: ${err?.message ?? err}`,
      ),
    );

    return data as Transaccion;
  }

  /**
   * Ancla una transacción recién creada en Monad (#1) junto al hash de su factura (#4).
   * Resuelve wallets de ambas partes; si falta alguna o blockchain está desactivado,
   * marca estado_onchain en consecuencia y NO falla.
   */
  private async anclarEnCadena(tx: Transaccion): Promise<void> {
    const supabase = this.supabaseService.getClient();

    if (!this.blockchain.isEnabled()) {
      return; // queda NO_ANCLADA (default)
    }

    const profiles = await this.getProfiles([tx.emisor_id, tx.receptor_id]);
    const emisorWallet = profiles.get(tx.emisor_id)?.wallet_address ?? null;
    const receptorWallet = profiles.get(tx.receptor_id)?.wallet_address ?? null;

    if (!emisorWallet || !receptorWallet) {
      await supabase
        .from('transacciones')
        .update({ estado_onchain: 'SIN_WALLET' })
        .eq('id', tx.id);
      return;
    }

    const montoCentavos = BigInt(Math.round(Number(tx.monto) * 100));
    const payload = JSON.stringify({
      id: tx.id,
      monto_centavos: montoCentavos.toString(),
      tipo: tx.tipo,
      emisor_id: tx.emisor_id,
      receptor_id: tx.receptor_id,
      created_at: tx.created_at,
    });
    const payloadHash = keccak256(stringToHex(payload));
    const facturaHash = tx.factura_hash
      ? (`0x${tx.factura_hash.replace(/^0x/, '')}` as `0x${string}`)
      : ZERO_BYTES32;

    try {
      const hash = await this.blockchain.anchorTransaction({
        txId: tx.id,
        payloadHash,
        facturaHash,
        emisor: emisorWallet as `0x${string}`,
        receptor: receptorWallet as `0x${string}`,
        monto: montoCentavos,
        tipo: tx.tipo === 'FACTURA' ? TipoOnchain.FACTURA : TipoOnchain.PAGO,
      });
      await supabase
        .from('transacciones')
        .update({ estado_onchain: 'REGISTRADA', anchor_tx_hash: hash })
        .eq('id', tx.id);
      this.logger.log(`Tx ${tx.id} anclada on-chain: ${hash}`);
    } catch (err: any) {
      if (String(err?.message ?? '').includes('ALREADY_ANCHORED')) {
        await supabase
          .from('transacciones')
          .update({ estado_onchain: 'REGISTRADA' })
          .eq('id', tx.id);
        return;
      }
      await supabase
        .from('transacciones')
        .update({ estado_onchain: 'ERROR' })
        .eq('id', tx.id);
      throw err;
    }
  }

  async listarTransacciones(
    cuentaId: string,
    usuarioId: string,
  ): Promise<TransaccionConDetalle[]> {
    await this.assertUserInCuenta(cuentaId, usuarioId);
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('transacciones')
      .select('*')
      .eq('cuenta_corriente_id', cuentaId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    const txs = (data ?? []) as Transaccion[];
    const onchainMap = await this.construirOnchainMap(txs, usuarioId);

    return txs.map((tx) => {
      const soyReceptor = tx.receptor_id === usuarioId;
      return {
        ...tx,
        contraparte: { id: '', email: '', dni: '', nombre: null },
        direccion: soyReceptor ? 'HACIA_MI' : 'POR_MI',
        factura_url: null,
        onchain: onchainMap.get(tx.id),
      } as TransaccionConDetalle;
    });
  }

  /**
   * Construye el resumen on-chain (estado, wallets vinculadas, acción pendiente)
   * para un conjunto de transacciones, desde la perspectiva de `usuarioId`.
   */
  private async construirOnchainMap(
    txs: Transaccion[],
    usuarioId: string,
  ): Promise<Map<string, OnchainResumen>> {
    const map = new Map<string, OnchainResumen>();
    if (txs.length === 0) return map;

    const supabase = this.supabaseService.getClient();
    const partyIds = txs.flatMap((t) => [t.emisor_id, t.receptor_id]);
    const profiles = await this.getProfiles(partyIds);

    const txIds = txs.map((t) => t.id);
    const { data: acciones } = await supabase
      .from('acciones_onchain')
      .select('*')
      .in('transaccion_id', txIds)
      .in('estado', ['PENDIENTE_FIRMAS', 'LISTA', 'ENVIADA']);

    const accionPorTx = new Map<string, AccionOnchain>();
    for (const a of (acciones ?? []) as AccionOnchain[]) {
      // si hay varias, quedarse con la más reciente
      const prev = accionPorTx.get(a.transaccion_id);
      if (!prev || a.created_at > prev.created_at) {
        accionPorTx.set(a.transaccion_id, a);
      }
    }

    for (const tx of txs) {
      const miId = usuarioId;
      const contraparteId =
        tx.emisor_id === miId ? tx.receptor_id : tx.emisor_id;
      map.set(tx.id, {
        estado_onchain: tx.estado_onchain ?? 'NO_ANCLADA',
        anchor_tx_hash: tx.anchor_tx_hash ?? null,
        factura_hash: tx.factura_hash ?? null,
        mi_wallet_linked: !!profiles.get(miId)?.wallet_address,
        contraparte_wallet_linked: !!profiles.get(contraparteId)?.wallet_address,
        accion_pendiente: accionPorTx.get(tx.id) ?? null,
      });
    }
    return map;
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
    const onchainMap = await this.construirOnchainMap(transacciones, usuarioId);

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
          onchain: onchainMap.get(tx.id),
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

    // sha256 de los bytes del PDF — prueba de integridad que se ancla on-chain (#4)
    const facturaHash =
      '0x' + createHash('sha256').update(file.buffer).digest('hex');

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
      factura_hash: facturaHash,
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

  // ─── Monad: wallet + acciones co-firmadas (EIP-712) ───

  async getPerfil(usuarioId: string): Promise<Profile> {
    const profiles = await this.getProfiles([usuarioId]);
    const p = profiles.get(usuarioId);
    if (!p) throw new NotFoundException('Perfil no encontrado');
    return p;
  }

  async vincularWallet(usuarioId: string, walletAddress: string): Promise<Profile> {
    const supabase = this.supabaseService.getClient();
    const normalized = walletAddress.toLowerCase();

    const { data, error } = await supabase
      .from('profiles')
      .update({ wallet_address: normalized })
      .eq('id', usuarioId)
      .select('id, email, dni, nombre, wallet_address')
      .single();

    if (error) {
      if (
        error.code === '23505' ||
        error.message?.includes('duplicate') ||
        error.message?.includes('unique')
      ) {
        throw new BadRequestException(
          'Esa wallet ya está vinculada a otro usuario',
        );
      }
      throw new BadRequestException(error.message);
    }
    return data as Profile;
  }

  private async cargarTransaccionDeUsuario(
    cuentaId: string,
    txId: string,
    usuarioId: string,
  ): Promise<Transaccion> {
    await this.assertUserInCuenta(cuentaId, usuarioId);
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('transacciones')
      .select('*')
      .eq('id', txId)
      .eq('cuenta_corriente_id', cuentaId)
      .single();
    if (error || !data) throw new NotFoundException('Transacción no encontrada');
    const tx = data as Transaccion;
    if (tx.emisor_id !== usuarioId && tx.receptor_id !== usuarioId) {
      throw new ForbiddenException('No participás en esta transacción');
    }
    return tx;
  }

  /** Inicia una acción co-firmada: valida estado, guarda la primera firma y devuelve qué firmar. */
  async iniciarAccion(
    cuentaId: string,
    txId: string,
    usuarioId: string,
    dto: IniciarAccionDto,
  ) {
    const tx = await this.cargarTransaccionDeUsuario(cuentaId, txId, usuarioId);
    const tipo = dto.tipo_accion as unknown as TipoAccion;

    const requeridos: Record<TipoAccion, string[]> = {
      CONFIRMAR: ['REGISTRADA'],
      PAGAR: ['CONFIRMADA'],
      REEMBOLSAR: ['PAGADA', 'REEMBOLSO_SOLICITADO'],
    };
    const estadoActual = tx.estado_onchain ?? 'NO_ANCLADA';
    if (!requeridos[tipo].includes(estadoActual)) {
      throw new BadRequestException(
        `La transacción debe estar ${requeridos[tipo].join('/')} on-chain para ${tipo} (está ${estadoActual})`,
      );
    }

    const profiles = await this.getProfiles([tx.emisor_id, tx.receptor_id]);
    if (!profiles.get(tx.emisor_id)?.wallet_address) {
      throw new BadRequestException('El emisor todavía no vinculó su wallet');
    }
    if (!profiles.get(tx.receptor_id)?.wallet_address) {
      throw new BadRequestException('El receptor todavía no vinculó su wallet');
    }

    const supabase = this.supabaseService.getClient();

    // limpiar acción previa no finalizada (re-intento)
    const { data: existing } = await supabase
      .from('acciones_onchain')
      .select('*')
      .eq('transaccion_id', txId)
      .eq('tipo_accion', tipo)
      .maybeSingle();
    if (existing) {
      if (['LISTA', 'ENVIADA', 'CONFIRMADA'].includes(existing.estado)) {
        throw new BadRequestException(
          'Ya hay una acción en curso o completada para esta transacción',
        );
      }
      await supabase.from('acciones_onchain').delete().eq('id', existing.id);
    }

    // nonce/deadline los genera y firma el iniciador; validamos coherencia.
    const nowSec = Math.floor(Date.now() / 1000);
    const deadline = Number(dto.deadline);
    if (
      !Number.isFinite(deadline) ||
      deadline <= nowSec ||
      deadline > nowSec + 2 * ACTION_TTL_SECONDS
    ) {
      throw new BadRequestException('deadline fuera de rango (máx 48h)');
    }
    const soyEmisor = tx.emisor_id === usuarioId;

    const { data: accion, error } = await supabase
      .from('acciones_onchain')
      .insert({
        transaccion_id: txId,
        tipo_accion: tipo,
        firma_emisor: soyEmisor ? dto.firma : null,
        firma_receptor: soyEmisor ? null : dto.firma,
        nonce: dto.nonce,
        deadline,
        estado: 'PENDIENTE_FIRMAS',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);

    if (tipo === 'REEMBOLSAR') {
      await supabase
        .from('transacciones')
        .update({ estado_onchain: 'REEMBOLSO_SOLICITADO' })
        .eq('id', txId);
    }

    return { accion: accion as AccionOnchain };
  }

  /** Segunda firma: completa las dos firmas y envía la tx on-chain (backend paga gas). */
  async firmarAccion(
    cuentaId: string,
    accionId: string,
    usuarioId: string,
    dto: FirmarAccionDto,
  ) {
    await this.assertUserInCuenta(cuentaId, usuarioId);
    const supabase = this.supabaseService.getClient();

    const { data: accionData, error } = await supabase
      .from('acciones_onchain')
      .select('*')
      .eq('id', accionId)
      .single();
    if (error || !accionData) throw new NotFoundException('Acción no encontrada');
    const accion = accionData as AccionOnchain;

    const { data: txData } = await supabase
      .from('transacciones')
      .select('*')
      .eq('id', accion.transaccion_id)
      .single();
    const tx = txData as Transaccion;
    if (!tx || tx.cuenta_corriente_id !== cuentaId) {
      throw new NotFoundException('Transacción no encontrada');
    }
    if (tx.emisor_id !== usuarioId && tx.receptor_id !== usuarioId) {
      throw new ForbiddenException('No participás en esta transacción');
    }
    if (accion.estado !== 'PENDIENTE_FIRMAS') {
      throw new BadRequestException('Esta acción ya no admite firmas');
    }

    const soyEmisor = tx.emisor_id === usuarioId;
    if (soyEmisor && accion.firma_emisor) {
      throw new BadRequestException('Ya firmaste esta acción');
    }
    if (!soyEmisor && accion.firma_receptor) {
      throw new BadRequestException('Ya firmaste esta acción');
    }

    const firma_emisor = soyEmisor ? dto.firma : accion.firma_emisor;
    const firma_receptor = soyEmisor ? accion.firma_receptor : dto.firma;

    if (!firma_emisor || !firma_receptor) {
      await supabase
        .from('acciones_onchain')
        .update({ firma_emisor, firma_receptor })
        .eq('id', accionId);
      const { data } = await supabase
        .from('acciones_onchain')
        .select('*')
        .eq('id', accionId)
        .single();
      return { accion: data as AccionOnchain, enviada: false };
    }

    // ambas firmas presentes → LISTA → enviar
    await supabase
      .from('acciones_onchain')
      .update({ firma_emisor, firma_receptor, estado: 'LISTA' })
      .eq('id', accionId);

    if (!this.blockchain.isEnabled()) {
      await supabase
        .from('acciones_onchain')
        .update({ estado: 'FALLIDA', error_msg: 'Blockchain desactivado en el backend' })
        .eq('id', accionId);
      throw new BadRequestException('Blockchain no está configurado en el backend');
    }

    const params = {
      txId: tx.id,
      nonce: BigInt(accion.nonce),
      deadline: BigInt(accion.deadline),
      sigEmisor: firma_emisor as `0x${string}`,
      sigReceptor: firma_receptor as `0x${string}`,
    };

    try {
      let hash: `0x${string}`;
      if (accion.tipo_accion === 'CONFIRMAR') {
        hash = await this.blockchain.submitConfirmInvoice(params);
      } else if (accion.tipo_accion === 'PAGAR') {
        // Nota: NO se toca el saldo (Mercado Pago ya lo movió). Solo registro on-chain.
        hash = await this.blockchain.submitPay(params);
      } else {
        hash = await this.blockchain.submitRefund(params);
      }

      const nuevoEstadoTx =
        accion.tipo_accion === 'CONFIRMAR'
          ? 'CONFIRMADA'
          : accion.tipo_accion === 'PAGAR'
            ? 'PAGADA'
            : 'REEMBOLSADA';

      await supabase
        .from('acciones_onchain')
        .update({ estado: 'CONFIRMADA', tx_hash: hash })
        .eq('id', accionId);
      await supabase
        .from('transacciones')
        .update({ estado_onchain: nuevoEstadoTx })
        .eq('id', tx.id);

      return { enviada: true, tx_hash: hash, estado_onchain: nuevoEstadoTx };
    } catch (err: any) {
      await supabase
        .from('acciones_onchain')
        .update({
          estado: 'FALLIDA',
          error_msg: String(err?.message ?? err).slice(0, 500),
        })
        .eq('id', accionId);
      throw new BadRequestException(
        `Falló el envío on-chain: ${err?.message ?? err}`,
      );
    }
  }

  async listarAcciones(
    cuentaId: string,
    txId: string,
    usuarioId: string,
  ): Promise<AccionOnchain[]> {
    await this.cargarTransaccionDeUsuario(cuentaId, txId, usuarioId);
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('acciones_onchain')
      .select('*')
      .eq('transaccion_id', txId)
      .order('created_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return (data ?? []) as AccionOnchain[];
  }
}
