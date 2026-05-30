'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';

interface Profile {
  id: string;
  email: string;
  dni: string;
  nombre: string | null;
}

interface CuentaCorriente {
  id: string;
  usuario_a_id: string;
  usuario_b_id: string;
  saldo: number;
  saldo_relativo: number;
  created_at: string;
  updated_at: string;
  contraparte: Profile;
}

interface ApiError {
  message: string | string[];
  statusCode: number;
}

function getToken(): string | null {
  return localStorage.getItem('access_token');
}

function formatSaldo(saldo: number): string {
  const abs = Math.abs(saldo);
  const formatted = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(abs);
  if (saldo > 0) return `+${formatted}`;
  if (saldo < 0) return `-${formatted}`;
  return formatted;
}

function saldoColor(saldo: number): string {
  if (saldo > 0) return 'text-emerald-400';
  if (saldo < 0) return 'text-red-400';
  return 'text-zinc-400';
}

function saldoBg(saldo: number): string {
  if (saldo > 0) return 'bg-emerald-500/10 border-emerald-500/20';
  if (saldo < 0) return 'bg-red-500/10 border-red-500/20';
  return 'bg-zinc-500/10 border-zinc-500/20';
}

export default function CuentasPage() {
  const router = useRouter();
  const [cuentas, setCuentas] = useState<CuentaCorriente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const fetchCuentas = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError('Sesión expirada. Iniciá sesión nuevamente.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/cuentas-corrientes`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body: ApiError = await res.json();
        const msg = Array.isArray(body.message)
          ? body.message.join(', ')
          : body.message;
        setError(msg);
        return;
      }

      const data: CuentaCorriente[] = await res.json();
      setCuentas(data);
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCuentas();
  }, [fetchCuentas]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);
    setCreating(true);

    const token = getToken();
    if (!token) {
      setCreateError('Sesión expirada. Iniciá sesión nuevamente.');
      setCreating(false);
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/cuentas-corrientes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ searchQuery: searchQuery.trim() }),
      });

      if (!res.ok) {
        const body: ApiError = await res.json();
        const msg = Array.isArray(body.message)
          ? body.message.join(', ')
          : body.message;
        setCreateError(msg);
        return;
      }

      const nueva: CuentaCorriente = await res.json();
      setCuentas((prev) => [nueva, ...prev]);
      setCreateSuccess(
        `Cuenta corriente creada con ${nueva.contraparte.nombre || nueva.contraparte.email}`,
      );
      setSearchQuery('');
      setTimeout(() => {
        setModalOpen(false);
        setCreateSuccess(null);
      }, 1500);
    } catch {
      setCreateError('Error de conexión con el servidor');
    } finally {
      setCreating(false);
    }
  }

  function openModal() {
    setCreateError(null);
    setCreateSuccess(null);
    setSearchQuery('');
    setModalOpen(true);
  }

  return (
    <div className="flex flex-1 flex-col px-4 pb-20 pt-6">
      {/* Header */}
      <div className="mx-auto w-full max-w-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Cuentas Corrientes
          </h1>
          <button
            onClick={openModal}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-4"
            >
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            Nueva
          </button>
        </div>

        {/* Error global */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-12 flex justify-center">
            <div className="size-8 animate-spin rounded-full border-2 border-zinc-600 border-t-indigo-500" />
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && cuentas.length === 0 && (
          <div className="mt-12 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-zinc-800/50">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="size-8 text-zinc-500"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="text-sm text-zinc-400">
              No tenés cuentas corrientes aún.
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Creá una nueva usando el D.N.I. o email de otra persona.
            </p>
          </div>
        )}

        {/* Lista de cuentas */}
        {!loading && cuentas.length > 0 && (
          <div className="mt-4 space-y-3">
            {cuentas.map((cuenta) => (
              <div
                key={cuenta.id}
                onClick={() => router.push(`/cuentas/${cuenta.id}`)}
                className="cursor-pointer rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {/* Avatar + nombre */}
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-600/20 text-sm font-bold text-indigo-400">
                        {(
                          cuenta.contraparte.nombre ||
                          cuenta.contraparte.email
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-zinc-100">
                          {cuenta.contraparte.nombre ||
                            cuenta.contraparte.email}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          DNI: {cuenta.contraparte.dni || '—'} ·{' '}
                          {cuenta.contraparte.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Saldo */}
                  <div
                    className={`shrink-0 rounded-lg border px-3 py-1.5 text-right ${saldoBg(cuenta.saldo_relativo)}`}
                  >
                    <p
                      className={`text-sm font-semibold ${saldoColor(cuenta.saldo_relativo)}`}
                    >
                      {formatSaldo(cuenta.saldo_relativo)}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {cuenta.saldo_relativo > 0
                        ? 'A favor'
                        : cuenta.saldo_relativo < 0
                          ? 'En contra'
                          : 'Sin saldo'}
                    </p>
                  </div>
                </div>

                <div className="mt-2 border-t border-white/5 pt-2">
                  <p className="text-[10px] text-zinc-600">
                    Creada el{' '}
                    {new Date(cuenta.created_at).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />

          {/* Content */}
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-100">
                Nueva Cuenta Corriente
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-zinc-500 transition hover:bg-white/10 hover:text-zinc-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-5"
                >
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            {createSuccess && (
              <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-400">
                {createSuccess}
              </div>
            )}

            {createError && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-400">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="searchQuery"
                  className="block text-sm font-medium text-gray-300"
                >
                  D.N.I. o Email de la otra persona
                </label>
                <input
                  id="searchQuery"
                  type="text"
                  required
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="12345678 o persona@email.com"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={creating || !searchQuery.trim()}
                className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
              >
                {creating ? 'Creando...' : 'Crear Cuenta Corriente'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
