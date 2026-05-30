export interface Categoria {
  id: string;
  nombre: string;
  slug: string;
  icono: string;
  color: string;
  orden: number;
  created_at: string;
}

export interface MetodoPago {
  id: string;
  nombre: string;
  slug: string;
  orden: number;
  activo: boolean;
  created_at: string;
}

// Una transacción de una categoría, vista desde el usuario actual.
export interface CategoriaTransaccion {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  contact: string;
  status: 'paid' | 'pending';
  invoiceNumber?: string;
}

// Categoría con los totales agregados de las transacciones del usuario.
export interface CategoriaResumen {
  id: string;
  slug: string;
  name: string;
  icon: string;
  color: string;
  total: number;
  paid: number;
  transactions: CategoriaTransaccion[];
}
