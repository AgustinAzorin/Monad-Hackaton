import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CuentaCorrienteService } from './cuenta-corriente.service';
import { CreateCuentaCorrienteDto } from './dto/create-cuenta-corriente.dto';
import {
  CreateTransaccionDto,
  ProcesarPagoMPDto,
  CreateMensajeDto,
  UpsertClavePublicaDto,
  LinkWalletDto,
  IniciarAccionDto,
  FirmarAccionDto,
} from './dto/create-transaccion.dto';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';

@Controller('cuentas-corrientes')
@UseGuards(SupabaseAuthGuard)
export class CuentaCorrienteController {
  constructor(private readonly service: CuentaCorrienteService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.service.findByUsuario(req.user.id);
  }

  // Todas las transacciones del usuario (todas sus cuentas). Debe declararse
  // antes de @Get(':id') para que la ruta estática no la capture el parámetro.
  @Get('mis-transacciones')
  misTransacciones(@Req() req: any) {
    return this.service.listarMisTransacciones(req.user.id);
  }

  // ─── Perfil / Wallet (Monad) — rutas estáticas antes de @Get(':id') ───

  @Get('perfil')
  getPerfil(@Req() req: any) {
    return this.service.getPerfil(req.user.id);
  }

  @Put('wallet')
  vincularWallet(@Body() dto: LinkWalletDto, @Req() req: any) {
    return this.service.vincularWallet(req.user.id, dto.wallet_address);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.findOne(id, req.user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCuentaCorrienteDto, @Req() req: any) {
    return this.service.create(req.user.id, dto);
  }

  // ─── Transacciones ───

  @Get(':id/transacciones')
  listarTransacciones(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return this.service.listarTransacciones(id, req.user.id);
  }

  @Post(':id/transaccion')
  @HttpCode(HttpStatus.CREATED)
  crearTransaccion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTransaccionDto,
    @Req() req: any,
  ) {
    return this.service.crearTransaccion(id, req.user.id, dto);
  }

  // ─── Acciones co-firmadas on-chain (Monad) ───

  @Get(':id/transacciones/:txId/acciones')
  listarAcciones(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('txId', ParseUUIDPipe) txId: string,
    @Req() req: any,
  ) {
    return this.service.listarAcciones(id, txId, req.user.id);
  }

  @Post(':id/transacciones/:txId/acciones')
  @HttpCode(HttpStatus.CREATED)
  iniciarAccion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('txId', ParseUUIDPipe) txId: string,
    @Body() dto: IniciarAccionDto,
    @Req() req: any,
  ) {
    return this.service.iniciarAccion(id, txId, req.user.id, dto);
  }

  @Post(':id/acciones/:accionId/firmar')
  @HttpCode(HttpStatus.OK)
  firmarAccion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('accionId', ParseUUIDPipe) accionId: string,
    @Body() dto: FirmarAccionDto,
    @Req() req: any,
  ) {
    return this.service.firmarAccion(id, accionId, req.user.id, dto);
  }

  // ─── Mercado Pago (Checkout API) ───

  @Post(':id/mercado-pago')
  @HttpCode(HttpStatus.CREATED)
  procesarPago(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ProcesarPagoMPDto,
    @Req() req: any,
  ) {
    return this.service.procesarPagoMercadoPago(id, req.user.id, dto);
  }

  // ─── Escaneo de Facturas ───

  @Post(':id/escanear-factura')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('factura', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async escanearFactura(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    await this.service.findOne(id, req.user.id);
    return this.service.escanearFactura(id, file);
  }

  // ─── Chat (E2EE) ───

  @Get(':id/mensajes')
  listarMensajes(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.listarMensajes(id, req.user.id);
  }

  @Post(':id/mensajes')
  @HttpCode(HttpStatus.CREATED)
  guardarMensaje(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMensajeDto,
    @Req() req: any,
  ) {
    return this.service.guardarMensaje(id, req.user.id, dto);
  }

  // ─── Claves Públicas (E2EE) ───

  @Get(':id/claves-publicas')
  obtenerClavesPublicas(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return this.service.obtenerClavesPublicas(id, req.user.id);
  }

  @Put(':id/clave-publica')
  upsertClavePublica(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertClavePublicaDto,
    @Req() req: any,
  ) {
    return this.service.upsertClavePublica(id, req.user.id, dto);
  }
}
