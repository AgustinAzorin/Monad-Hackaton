import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createWorker, type Worker } from 'tesseract.js';
import PDFDocument from 'pdfkit';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../config/supabase.service';
import { CuentaCorrienteService } from '../cuenta-corriente/cuenta-corriente.service';
import { TipoTransaccion } from '../cuenta-corriente/dto/create-transaccion.dto';
import {
  ConceptoFactura,
  DatosFacturaOcr,
  FacturaOcrGenerada,
} from '../cuenta-corriente/cuenta-corriente.entity';

const FACTURAS_BUCKET = 'facturas';
const FACTURA_URL_TTL_SECONDS = 60 * 60; // 1 hora

// Palabras clave (en orden de prioridad) que suelen preceder al monto total.
const TOTAL_KEYWORDS = [
  'total\\s*a\\s*pagar',
  'neto\\s*a\\s*pagar',
  'importe\\s*total',
  'monto\\s*total',
  'total\\s*final',
  'gran\\s*total',
  'a\\s*pagar',
  'total',
  'neto',
];

@Injectable()
export class FacturasService {
  private readonly logger = new Logger(FacturasService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly cuentaCorrienteService: CuentaCorrienteService,
  ) {}

  // Orquesta todo el flujo: OCR → parseo → PDF → Storage → transacción PENDIENTE.
  async ocrGenerar(
    usuarioId: string,
    file: Express.Multer.File,
    cuentaId: string,
    receptorId: string,
    descripcionOverride?: string,
  ): Promise<FacturaOcrGenerada> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No se recibió ninguna imagen.');
    }
    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException(
        'Formato no soportado. Subí una imagen (JPG, PNG, etc.).',
      );
    }

    // 1) OCR local con Tesseract en español.
    const textoCrudo = await this.extraerTexto(file.buffer);

    // 2) Parseo inteligente del texto plano.
    const datos = this.parsearFactura(textoCrudo);
    if (descripcionOverride?.trim()) {
      datos.observaciones = descripcionOverride.trim();
    }
    if (datos.monto_total === null || datos.monto_total <= 0) {
      throw new BadRequestException(
        'No se pudo detectar un monto en la imagen. Reintentá con una foto más nítida o cargá el monto manualmente.',
      );
    }

    // 3) PDF formal con los datos estructurados.
    const pdfBuffer = await this.generarPdfFactura(datos, receptorId);

    // 4) Subida del PDF al Storage privado de Supabase.
    const path = await this.subirPdf(cuentaId, pdfBuffer);

    // 5) Registro de la transacción como PENDIENTE (tipo FACTURA no toca el saldo).
    const descripcion = this.construirDescripcion(datos);
    const transaccion = await this.cuentaCorrienteService.crearTransaccion(
      cuentaId,
      usuarioId,
      {
        monto: datos.monto_total,
        tipo: TipoTransaccion.FACTURA,
        receptor_id: receptorId,
        url_factura: path ?? undefined,
        descripcion,
      },
    );

    return {
      transaccion,
      factura_url: await this.firmarUrl(path),
      datos_extraidos: datos,
      texto_crudo: textoCrudo.substring(0, 4000),
    };
  }

  // ─── OCR ───

  private async extraerTexto(buffer: Buffer): Promise<string> {
    let worker: Worker | null = null;
    try {
      worker = await createWorker('spa');
      const { data } = await worker.recognize(buffer);
      return data.text ?? '';
    } catch (err) {
      this.logger.error('Fallo el OCR de Tesseract', err as Error);
      throw new BadRequestException(
        'No se pudo procesar la imagen con el motor de OCR.',
      );
    } finally {
      if (worker) await worker.terminate();
    }
  }

  // ─── Parseo inteligente ───

  private parsearFactura(texto: string): DatosFacturaOcr {
    const lineas = texto
      .split('\n')
      .map((l) => l.replace(/\s+/g, ' ').trim())
      .filter((l) => l.length > 0);

    const { monto, confianza } = this.detectarMontoTotal(lineas, texto);
    const conceptos = this.detectarConceptos(lineas);

    // Texto legible completo como respaldo / observaciones.
    const observaciones = lineas.join('\n');

    return {
      monto_total: monto,
      conceptos,
      observaciones,
      confianza,
    };
  }

  // Busca el monto total por palabras clave (alta confianza) y, si no encuentra,
  // cae a heurística del mayor importe presente (confianza media/baja).
  private detectarMontoTotal(
    lineas: string[],
    textoCompleto: string,
  ): { monto: number | null; confianza: 'alta' | 'media' | 'baja' } {
    const patrones = TOTAL_KEYWORDS.map(
      (kw) => new RegExp(`${kw}[\\s:.$=-]*\\$?\\s*([\\d.,]+)`, 'i'),
    );

    // Recorremos de abajo hacia arriba: el total suele estar al final.
    for (const patron of patrones) {
      for (let i = lineas.length - 1; i >= 0; i--) {
        const match = lineas[i].match(patron);
        if (match) {
          const valor = this.parsearNumero(match[1]);
          if (valor && valor > 0) return { monto: valor, confianza: 'alta' };
        }
      }
    }

    // Heurística: el mayor importe con símbolo "$" del documento.
    const conSimbolo: number[] = [];
    const regexSimbolo = /\$\s*([\d.,]+)/g;
    let m: RegExpExecArray | null;
    while ((m = regexSimbolo.exec(textoCompleto)) !== null) {
      const v = this.parsearNumero(m[1]);
      if (v && v > 0) conSimbolo.push(v);
    }
    if (conSimbolo.length > 0) {
      return { monto: Math.max(...conSimbolo), confianza: 'media' };
    }

    // Último recurso: el mayor número decimal del texto.
    const decimales: number[] = [];
    const regexDecimal = /(\d[\d.,]*[.,]\d{2})\b/g;
    while ((m = regexDecimal.exec(textoCompleto)) !== null) {
      const v = this.parsearNumero(m[1]);
      if (v && v > 0) decimales.push(v);
    }
    if (decimales.length > 0) {
      return { monto: Math.max(...decimales), confianza: 'baja' };
    }

    return { monto: null, confianza: 'baja' };
  }

  // Identifica líneas "descripción ... precio" como conceptos de la factura.
  private detectarConceptos(lineas: string[]): ConceptoFactura[] {
    const conceptos: ConceptoFactura[] = [];
    // Descripción (con al menos 2 letras) seguida de un importe al final.
    const patron = /^(.*[a-zA-ZáéíóúñÁÉÍÓÚÑ]{2,}.*?)\s+\$?\s*([\d.,]+)\s*$/;

    for (const linea of lineas) {
      // Saltamos las líneas de totales: ya están capturadas como monto_total.
      if (/total|neto|subtotal|a\s*pagar|iva|descuento/i.test(linea)) continue;

      const match = linea.match(patron);
      if (!match) continue;

      const descripcion = match[1].replace(/[.\-:]+$/, '').trim();
      const monto = this.parsearNumero(match[2]);
      if (descripcion.length < 2 || monto === null || monto <= 0) continue;

      conceptos.push({ descripcion, monto });
      if (conceptos.length >= 25) break; // tope defensivo
    }

    return conceptos;
  }

  // Normaliza números en formato argentino (1.234,56) o anglosajón (1,234.56).
  private parsearNumero(str: string): number | null {
    let limpio = str.trim();
    if (limpio.includes(',') && limpio.includes('.')) {
      const ultimaComa = limpio.lastIndexOf(',');
      const ultimoPunto = limpio.lastIndexOf('.');
      if (ultimaComa > ultimoPunto) {
        limpio = limpio.replace(/\./g, '').replace(',', '.');
      } else {
        limpio = limpio.replace(/,/g, '');
      }
    } else if (limpio.includes(',')) {
      const partes = limpio.split(',');
      if (partes[partes.length - 1].length === 2) {
        limpio = limpio.replace(/,/g, '.');
      } else {
        limpio = limpio.replace(/,/g, '');
      }
    }
    const val = parseFloat(limpio);
    return isNaN(val) ? null : val;
  }

  private construirDescripcion(datos: DatosFacturaOcr): string {
    if (datos.conceptos.length > 0) {
      const detalle = datos.conceptos
        .slice(0, 5)
        .map((c) => c.descripcion)
        .join(', ');
      return `Factura escaneada (OCR): ${detalle}`.substring(0, 255);
    }
    return 'Factura escaneada (OCR)';
  }

  // ─── Generación del PDF (pdfkit) ───

  private generarPdfFactura(
    datos: DatosFacturaOcr,
    receptorId: string,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        this.dibujarFactura(doc, datos, receptorId);
        doc.end();
      } catch (err) {
        reject(err as Error);
      }
    });
  }

  private dibujarFactura(
    doc: PDFKit.PDFDocument,
    datos: DatosFacturaOcr,
    receptorId: string,
  ): void {
    const azul = '#1e3a8a';
    const gris = '#6b7280';
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const ancho = right - left;
    const fmt = (n: number | null) =>
      n === null
        ? '-'
        : new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
          }).format(n);

    // Encabezado corporativo.
    doc.rect(left, 50, ancho, 70).fill(azul);
    doc
      .fillColor('#ffffff')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('FACTURA', left + 20, 68);
    doc
      .fontSize(10)
      .font('Helvetica')
      .text('Documento generado por escaneo OCR', left + 20, 98);

    const nroFactura = randomUUID().slice(0, 8).toUpperCase();
    doc.fontSize(10).text(`N° ${nroFactura}`, left, 72, {
      width: ancho - 20,
      align: 'right',
    });

    // Datos de cabecera.
    let y = 145;
    doc.fillColor('#111827').fontSize(11).font('Helvetica-Bold');
    doc.text('Dirigida a:', left, y);
    doc.font('Helvetica').fillColor(gris);
    doc.text(`Cliente ID: ${receptorId}`, left, y + 16);

    doc.font('Helvetica-Bold').fillColor('#111827');
    doc.text('Estado:', right - 200, y, { width: 200, align: 'right' });
    doc.font('Helvetica').fillColor('#b45309');
    doc.text('PENDIENTE DE PAGO', right - 200, y + 16, {
      width: 200,
      align: 'right',
    });

    // Tabla de conceptos.
    y = 215;
    doc.rect(left, y, ancho, 24).fill(azul);
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
    doc.text('Descripción', left + 12, y + 7);
    doc.text('Importe', right - 132, y + 7, { width: 120, align: 'right' });
    y += 24;

    doc.font('Helvetica').fontSize(10).fillColor('#111827');
    const conceptos =
      datos.conceptos.length > 0
        ? datos.conceptos
        : [
            {
              descripcion: 'Servicios / productos según documento',
              monto: datos.monto_total,
            },
          ];

    let alterno = false;
    for (const c of conceptos) {
      const altura = 22;
      if (alterno) doc.rect(left, y, ancho, altura).fill('#f3f4f6');
      doc.fillColor('#111827');
      const desc =
        c.descripcion.length > 70
          ? `${c.descripcion.slice(0, 67)}...`
          : c.descripcion;
      doc.text(desc, left + 12, y + 6, { width: ancho - 160 });
      doc.text(fmt(c.monto), right - 132, y + 6, {
        width: 120,
        align: 'right',
      });
      y += altura;
      alterno = !alterno;

      if (y > doc.page.height - 160) {
        doc.addPage();
        y = doc.page.margins.top;
      }
    }

    // Total.
    y += 12;
    doc.moveTo(left, y).lineTo(right, y).strokeColor('#d1d5db').stroke();
    y += 14;
    doc.font('Helvetica-Bold').fontSize(14).fillColor(azul);
    doc.text('TOTAL', right - 260, y, { width: 120, align: 'right' });
    doc.text(fmt(datos.monto_total), right - 132, y, {
      width: 120,
      align: 'right',
    });

    // Observaciones (texto crudo legible del OCR).
    if (datos.observaciones) {
      y += 50;
      if (y > doc.page.height - 160) {
        doc.addPage();
        y = doc.page.margins.top;
      }
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827');
      doc.text('Observaciones / Texto detectado:', left, y);
      doc.font('Helvetica').fontSize(8).fillColor(gris);
      doc.text(datos.observaciones.substring(0, 1500), left, y + 14, {
        width: ancho,
        align: 'left',
        lineGap: 1,
      });
    }

    // Pie de página.
    const pieY = doc.page.height - 60;
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(gris)
      .text(
        `Confianza de extracción OCR: ${datos.confianza.toUpperCase()} · Verificá los datos antes de aprobar el pago.`,
        left,
        pieY,
        { width: ancho, align: 'center' },
      );
  }

  // ─── Supabase Storage ───

  private async subirPdf(
    cuentaId: string,
    buffer: Buffer,
  ): Promise<string | null> {
    const supabase = this.supabaseService.getClient();
    const path = `${cuentaId}/${randomUUID()}.pdf`;
    const { error } = await supabase.storage
      .from(FACTURAS_BUCKET)
      .upload(path, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (error) {
      this.logger.error(`No se pudo subir el PDF: ${error.message}`);
      return null;
    }
    return path;
  }

  private async firmarUrl(path: string | null): Promise<string | null> {
    if (!path) return null;
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase.storage
      .from(FACTURAS_BUCKET)
      .createSignedUrl(path, FACTURA_URL_TTL_SECONDS);
    if (error || !data) return null;
    return data.signedUrl;
  }
}
