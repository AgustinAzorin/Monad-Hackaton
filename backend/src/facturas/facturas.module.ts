import { Module } from '@nestjs/common';
import { FacturasController } from './facturas.controller';
import { FacturasService } from './facturas.service';
import { CuentaCorrienteModule } from '../cuenta-corriente/cuenta-corriente.module';

@Module({
  imports: [CuentaCorrienteModule],
  controllers: [FacturasController],
  providers: [FacturasService],
})
export class FacturasModule {}
