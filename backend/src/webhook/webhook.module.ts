import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { CuentaCorrienteModule } from '../cuenta-corriente/cuenta-corriente.module';

@Module({
  imports: [CuentaCorrienteModule],
  controllers: [WebhookController],
})
export class WebhookModule {}
