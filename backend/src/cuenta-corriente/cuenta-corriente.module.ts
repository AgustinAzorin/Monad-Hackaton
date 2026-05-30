import { Module } from '@nestjs/common';
import { CuentaCorrienteController } from './cuenta-corriente.controller';
import { CuentaCorrienteService } from './cuenta-corriente.service';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [BlockchainModule],
  controllers: [CuentaCorrienteController],
  providers: [CuentaCorrienteService],
  exports: [CuentaCorrienteService],
})
export class CuentaCorrienteModule {}
