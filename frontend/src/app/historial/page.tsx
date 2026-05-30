'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { TransaccionConDetalle } from '@/types/cuenta';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';

function getToken(): string | null {
  return localStorage.getItem('access_token');
}

function formatMonto(monto: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(Math.abs(monto));
}

function formatFecha(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Tab = 'HACIA_MI' | 'POR_MI';

export default function HistorialPage() {
  const [transacciones, setTransacciones] = useState<TransaccionConDetalle[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('HACIA_MI');
  const [seleccionada, setSeleccionada] =
    useState<TransaccionConDetalle | null>(null);

  const fetchTransacciones = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError('Sesión expirada. Iniciá sesión nuevamente.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/cuentas-corrientes/mis-transacciones`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res
          .json()
          .catch(() => ({ message: 'Error del servidor' }));
        setError(
          Array.isArray(body.message) ? body.message.join(', ') : body.message,
        );
        return;
      }

      const data: TransaccionConDetalle[] = await res.json();
      setTransacciones(data);
    } catch {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransacciones();
  }, [fetchTransacciones]);

  const visibles = useMemo(
    () => transacciones.filter((tx) => tx.direccion === tab),
    [transacciones, tab],
  );

  const conteo = useMemo(
    () => ({
      HACIA_MI: transacciones.filter((t) => t.direccion === 'HACIA_MI').length,
      POR_MI: transacciones.filter((t) => t.direccion === 'POR_MI').length,
    }),
    [transacciones],
  );

  return (
    <div className="flex flex-1 flex-col px-4 pb-20 pt-6">
      <div className="mx-auto w-full max-w-lg">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Historial
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Todas tus transacciones en un solo lugar.
        </p>

        {/* Tabs */}
        <div className="mt-5 flex rounded-xl border border-white/10 bg-white/5 p-1">
          <button
            onClick={() => setTab('HACIA_MI')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${
              tab === 'HACIA_MI'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Hacia mí
            {conteo.HACIA_MI > 0 && (
              <span className="ml-1.5 text-xs opacity-70">
                ({conteo.HACIA_MI})
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('POR_MI')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${
              tab === 'POR_MI'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Por mí
            {conteo.POR_MI > 0 && (
              <span className="ml-1.5 text-xs opacity-70">
                ({conteo.POR_MI})
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading && (
          <div className="mt-12 flex justify-center">
            <div className="size-8 animate-spin rounded-full border-2 border-zinc-600 border-t-indigo-500" />
          </div>
        )}

        {!loading && !error && visibles.length === 0 && (
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
                <path d="M3 3v18h18" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
            </div>
            <p className="text-sm text-zinc-400">
              {tab === 'HACIA_MI'
                ? 'No tenés transacciones dirigidas a vos todavía.'
                : 'No realizaste transacciones todavía.'}
            </p>
          </div>
        )}

        {!loading && visibles.length > 0 && (
          <div className="mt-4 space-y-3">
            {visibles.map((tx) => {
              const esPago = tx.tipo === 'PAGO';
              const pendiente = tx.estado === 'PENDIENTE';
              const nombre =
                tx.contraparte.nombre || tx.contraparte.email || 'Usuario';

              return (
                <button
                  key={tx.id}
                  onClick={() => setSeleccionada(tx)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-white/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex size-9 items-center justify-center rounded-full ${
                          esPago
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}
                      >
                        {esPago ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                            <path fillRule="evenodd" d="M1 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4Zm12 4a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM4 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm13-1a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                            <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-200">
                          {esPago ? 'Pago' : 'Factura'}
                          <span className="ml-1 font-normal text-zinc-500">
                            · {nombre}
                          </span>
                        </p>
                        <p className="text-xs text-zinc-500">
                          {formatFecha(tx.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <p
                        className={`text-sm font-semibold ${
                          esPago ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {formatMonto(tx.monto)}
                      </p>
                      <div className="flex items-center gap-1">
                        {tx.url_factura && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-3.5 text-zinc-500" aria-label="Factura adjunta">
                            <path fillRule="evenodd" d="M15.621 4.379a3 3 0 0 0-4.242 0l-7 7a3 3 0 0 0 4.241 4.243h.001l.497-.5a.75.75 0 0 1 1.064 1.057l-.498.501-.002.002a4.5 4.5 0 0 1-6.364-6.364l7-7a4.5 4.5 0 0 1 6.368 6.36l-3.455 3.553A2.625 2.625 0 1 1 9.52 9.52l3.45-3.451a.75.75 0 1 1 1.061 1.06l-3.45 3.451a1.125 1.125 0 0 0 1.587 1.595l3.454-3.553a3 3 0 0 0 0-4.242Z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            pendiente
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-emerald-500/15 text-emerald-400'
                          }`}
                        >
                          {tx.estado}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Modal: Detalle de transacción ─── */}
      {seleccionada && (
        <DetalleModal
          tx={seleccionada}
          onClose={() => setSeleccionada(null)}
        />
      )}
    </div>
  );
}

function DetalleModal({
  tx,
  onClose,
}: {
  tx: TransaccionConDetalle;
  onClose: () => void;
}) {
  const esPago = tx.tipo === 'PAGO';
  const nombre = tx.contraparte.nombre || tx.contraparte.email || 'Usuario';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-100">
            Detalle de {esPago ? 'pago' : 'factura'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-500 transition hover:bg-white/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Monto destacado */}
        <div
          className={`mb-5 rounded-xl border p-5 text-center ${
            esPago
              ? 'border-emerald-500/20 bg-emerald-500/5'
              : 'border-amber-500/20 bg-amber-500/5'
          }`}
        >
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            {esPago ? 'Pago' : 'Factura'} ·{' '}
            {tx.direccion === 'HACIA_MI' ? 'Hacia mí' : 'Por mí'}
          </p>
          <p
            className={`mt-1 text-3xl font-bold ${
              esPago ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {formatMonto(tx.monto)}
          </p>
          <span
            className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-medium ${
              tx.estado === 'PENDIENTE'
                ? 'bg-amber-500/15 text-amber-400'
                : 'bg-emerald-500/15 text-emerald-400'
            }`}
          >
            {tx.estado}
          </span>
        </div>

        {/* Datos */}
        <dl className="space-y-3 text-sm">
          <Fila label={tx.direccion === 'HACIA_MI' ? 'De' : 'Para'} value={nombre} />
          {tx.contraparte.dni && (
            <Fila label="DNI" value={tx.contraparte.dni} />
          )}
          {tx.contraparte.email && (
            <Fila label="Email" value={tx.contraparte.email} />
          )}
          <Fila label="Fecha" value={formatFecha(tx.created_at)} />
          {tx.descripcion && (
            <Fila label="Descripción" value={tx.descripcion} />
          )}
          {tx.mercado_pago_payment_id && (
            <Fila
              label="Comprobante MP"
              value={`#${tx.mercado_pago_payment_id}`}
            />
          )}
          <Fila label="ID transacción" value={tx.id} mono />
        </dl>

        {/* Factura PDF */}
        {tx.factura_url ? (
          <div className="mt-5">
            <p className="mb-2 text-sm font-medium text-zinc-300">
              Factura adjunta
            </p>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <iframe
                src={tx.factura_url}
                title="Factura"
                className="h-72 w-full bg-white"
              />
            </div>
            <a
              href={tx.factura_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clipRule="evenodd" />
              </svg>
              Abrir factura en nueva pestaña
            </a>
          </div>
        ) : (
          tx.tipo === 'FACTURA' && (
            <p className="mt-5 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center text-xs text-zinc-500">
              Esta factura no tiene PDF adjunto.
            </p>
          )
        )}
      </div>
    </div>
  );
}

function Fila({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-3 last:border-0">
      <dt className="shrink-0 text-zinc-500">{label}</dt>
      <dd
        className={`text-right text-zinc-200 ${mono ? 'break-all font-mono text-xs' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}
