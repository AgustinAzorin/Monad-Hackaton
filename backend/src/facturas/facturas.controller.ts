import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FacturasService } from './facturas.service';
import { OcrGenerarDto } from './dto/ocr-generar.dto';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';

@Controller('facturas')
@UseGuards(SupabaseAuthGuard)
export class FacturasController {
  constructor(private readonly facturasService: FacturasService) {}

  // POST /facturas/ocr-generar
  // multipart/form-data: imagen (archivo), cuenta_corriente_id, receptor_id, descripcion?
  @Post('ocr-generar')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('imagen', {
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  ocrGenerar(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: OcrGenerarDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.facturasService.ocrGenerar(
      req.user.id,
      file,
      dto.cuenta_corriente_id,
      dto.receptor_id,
      dto.descripcion,
    );
  }
}
