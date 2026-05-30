import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { CuentaCorrienteService } from '../cuenta-corriente/cuenta-corriente.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly cuentaService: CuentaCorrienteService) {}

  @Post('mercado-pago')
  @HttpCode(HttpStatus.OK)
  async mercadoPago(@Body() body: any) {
    this.logger.log(`MP Webhook received: ${JSON.stringify(body)}`);

    if (body.type === 'payment' && body.data?.id) {
      await this.cuentaService.procesarWebhookMercadoPago(
        String(body.data.id),
      );
    }

    return { ok: true };
  }
}
