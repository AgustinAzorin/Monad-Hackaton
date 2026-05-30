export interface Profile {
  id: string;
  email: string;
  dni: string;
  nombre: string | null;
}

export interface CuentaCorriente {
  id: string;
  usuario_a_id: string;
  usuario_b_id: string;
  saldo: number;
  created_at: string;
  updated_at: string;
}

export interface CuentaCorrienteConPerfil extends CuentaCorriente {
  contraparte: Profile;
  saldo_relativo: number;
}
