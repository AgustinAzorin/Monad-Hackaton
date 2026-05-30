import { Module } from '@nestjs/common';
import { CuentasBancariasController } from './cuentas-bancarias.controller';
import { CuentasBancariasService } from './cuentas-bancarias.service';

@Module({
  controllers: [CuentasBancariasController],
  providers: [CuentasBancariasService],
  exports: [CuentasBancariasService],
})
export class CuentasBancariasModule {}
