import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import {
  Categoria,
  MetodoPago,
  CategoriaResumen,
  CategoriaTransaccion,
} from './catalogos.entity';

interface ProfileLite {
  id: string;
  email: string;
  nombre: string | null;
}

@Injectable()
export class CatalogosService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listarCategorias(): Promise<Categoria[]> {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .order('orden', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return (data ?? []) as Categoria[];
  }

  async listarMetodosPago(): Promise<MetodoPago[]> {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('metodos_pago')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return (data ?? []) as MetodoPago[];
  }

  // Agrupa todas las transacciones del usuario por categoría y devuelve los
  // totales (total / pagado) junto con el detalle de cada transacción.
  async resumenCategorias(usuarioId: string): Promise<CategoriaResumen[]> {
    const supabase = this.supabaseService.getClient();

    const [{ data: catData, error: catError }, { data: txData, error: txError }] =
      await Promise.all([
        supabase.from('categorias').select('*').order('orden', { ascending: true }),
        supabase
          .from('transacciones')
          .select('*')
          .or(`emisor_id.eq.${usuarioId},receptor_id.eq.${usuarioId}`)
          .order('created_at', { ascending: false }),
      ]);

    if (catError) throw new BadRequestException(catError.message);
    if (txError) throw new BadRequestException(txError.message);

    const categorias = (catData ?? []) as Categoria[];
    const transacciones = txData ?? [];

    // Perfiles de las contrapartes para mostrar el nombre del contacto.
    const contraparteIds = [
      ...new Set(
        transacciones.map((tx) =>
          tx.emisor_id === usuarioId ? tx.receptor_id : tx.emisor_id,
        ),
      ),
    ];
    const perfiles = await this.getProfiles(contraparteIds);

    const SIN_CATEGORIA = 'otros';
    const porSlug = new Map<string, CategoriaTransaccion[]>();

    for (const tx of transacciones) {
      const slug: string = tx.categoria_slug ?? SIN_CATEGORIA;
      const soyReceptor = tx.receptor_id === usuarioId;
      const contraparteId = soyReceptor ? tx.emisor_id : tx.receptor_id;
      const perfil = perfiles.get(contraparteId);

      const item: CategoriaTransaccion = {
        id: tx.id,
        description: tx.descripcion ?? 'Sin descripción',
        amount: Number(tx.monto),
        // Si soy el receptor, el dinero entra (income); si lo envío, sale (expense).
        type: soyReceptor ? 'income' : 'expense',
        date: tx.created_at,
        contact: perfil?.nombre || perfil?.email || 'Contacto',
        status: tx.estado === 'COMPLETADO' ? 'paid' : 'pending',
      };

      const lista = porSlug.get(slug) ?? [];
      lista.push(item);
      porSlug.set(slug, lista);
    }

    return categorias
      .map((cat) => {
        const txs = porSlug.get(cat.slug) ?? [];
        const total = txs.reduce((acc, t) => acc + t.amount, 0);
        const paid = txs
          .filter((t) => t.status === 'paid')
          .reduce((acc, t) => acc + t.amount, 0);

        return {
          id: cat.id,
          slug: cat.slug,
          name: cat.nombre,
          icon: cat.icono,
          color: cat.color,
          total,
          paid,
          transactions: txs,
        } as CategoriaResumen;
      })
      .filter((c) => c.transactions.length > 0);
  }

  private async getProfiles(ids: string[]): Promise<Map<string, ProfileLite>> {
    if (ids.length === 0) return new Map();
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, nombre')
      .in('id', ids);

    if (error) throw new BadRequestException(error.message);

    const map = new Map<string, ProfileLite>();
    for (const p of data ?? []) {
      map.set(p.id, p as ProfileLite);
    }
    return map;
  }
}
