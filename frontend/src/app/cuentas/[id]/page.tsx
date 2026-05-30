'use client';

import { useState, useEffect, useCallback, useRef, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import {
  generateKeyPair,
  exportPublicKey,
  exportPrivateKey,
  importPublicKey,
  importPrivateKey,
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
  storeKeyPair,
  getStoredKeyPair,
} from '@/lib/crypto';
import type {
  CuentaCorriente,
  Transaccion,
  MensajeDescifrado,
  MensajeChat,
  FacturaEscaneada,
  MercadoPagoResult,
} from '@/types/cuenta';

const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY ?? '';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';

function getToken(): string | null {
  return localStorage.getItem('access_token');
}

function getUserId(): string | null {
  try {
    const token = getToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

function formatSaldo(saldo: number): string {
  const abs = Math.abs(saldo);
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(abs);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Error del servidor' }));
    throw new Error(
      Array.isArray(body.message) ? body.message.join(', ') : body.message,
    );
  }
  return res.json();
}

type Tab = 'historial' | 'chat';

export default function CuentaDetallePage() {
  const params = useParams();
  const router = useRouter();
  const cuentaId = params.id as string;
  const userId = getUserId();

  const [cuenta, setCuenta] = useState<CuentaCorriente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('historial');

  // Historial
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  // Chat E2EE
  const [mensajes, setMensajes] = useState<MensajeDescifrado[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [sharedKey, setSharedKey] = useState<CryptoKey | null>(null);
  const [chatReady, setChatReady] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Modals
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [showFacturaModal, setShowFacturaModal] = useState(false);
  const [pagoMonto, setPagoMonto] = useState('');
  const [pagoDesc, setPagoDesc] = useState('');
  const [pagando, setPagando] = useState(false);
  const [pagoStep, setPagoStep] = useState<'monto' | 'tarjeta' | 'resultado'>('monto');
  const [pagoResultado, setPagoResultado] = useState<MercadoPagoResult | null>(null);
  const [pagoError, setPagoError] = useState<string | null>(null);
  const mpBrickRef = useRef<HTMLDivElement>(null);
  const brickControllerRef = useRef<any>(null);

  // Factura
  const [facturaFile, setFacturaFile] = useState<File | null>(null);
  const [escaneando, setEscaneando] = useState(false);
  const [facturaResult, setFacturaResult] = useState<FacturaEscaneada | null>(null);
  const [facturaMontoConfirmado, setFacturaMontoConfirmado] = useState('');
  const [enviandoFactura, setEnviandoFactura] = useState(false);

  // ─── Cargar cuenta ───
  const fetchCuenta = useCallback(async () => {
    try {
      const data = await apiFetch<CuentaCorriente>(
        `/cuentas-corrientes/${cuentaId}`,
      );
      setCuenta(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [cuentaId]);

  // ─── Cargar transacciones ───
  const fetchTransacciones = useCallback(async () => {
    setLoadingTx(true);
    try {
      const data = await apiFetch<Transaccion[]>(
        `/cuentas-corrientes/${cuentaId}/transacciones`,
      );
      setTransacciones(data);
    } catch {
      // silent
    } finally {
      setLoadingTx(false);
    }
  }, [cuentaId]);

  // ─── Setup E2EE ───
  const setupEncryption = useCallback(async () => {
    if (!userId || !cuentaId) return;

    try {
      let pubB64: string;
      let privB64: string;

      const stored = getStoredKeyPair(cuentaId);
      if (stored) {
        pubB64 = stored.pub;
        privB64 = stored.priv;
      } else {
        const keyPair = await generateKeyPair();
        pubB64 = await exportPublicKey(keyPair.publicKey);
        privB64 = await exportPrivateKey(keyPair.privateKey);
        storeKeyPair(cuentaId, pubB64, privB64);
      }

      await apiFetch(`/cuentas-corrientes/${cuentaId}/clave-publica`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave_publica: pubB64 }),
      });

      const claves = await apiFetch<any[]>(
        `/cuentas-corrientes/${cuentaId}/claves-publicas`,
      );
      const otraClave = claves.find((c: any) => c.usuario_id !== userId);

      if (otraClave) {
        const myPrivateKey = await importPrivateKey(privB64);
        const otherPublicKey = await importPublicKey(otraClave.clave_publica);
        const derived = await deriveSharedKey(myPrivateKey, otherPublicKey);
        setSharedKey(derived);
        setChatReady(true);
      }
    } catch {
      // Key exchange incomplete
    }
  }, [userId, cuentaId]);

  // ─── Cargar y descifrar mensajes ───
  const fetchAndDecryptMessages = useCallback(
    async (key: CryptoKey) => {
      try {
        const encrypted = await apiFetch<MensajeChat[]>(
          `/cuentas-corrientes/${cuentaId}/mensajes`,
        );
        const decrypted: MensajeDescifrado[] = await Promise.all(
          encrypted.map(async (m) => {
            try {
              const texto = await decryptMessage(key, m.texto_encriptado, m.iv);
              return {
                id: m.id,
                remitente_id: m.remitente_id,
                texto,
                created_at: m.created_at,
              };
            } catch {
              return {
                id: m.id,
                remitente_id: m.remitente_id,
                texto: '[No se pudo descifrar]',
                created_at: m.created_at,
              };
            }
          }),
        );
        setMensajes(decrypted);
      } catch {
        // silent
      }
    },
    [cuentaId],
  );

  useEffect(() => {
    fetchCuenta();
    fetchTransacciones();
  }, [fetchCuenta, fetchTransacciones]);

  useEffect(() => {
    if (tab === 'chat') {
      setupEncryption();
    }
  }, [tab, setupEncryption]);

  useEffect(() => {
    if (sharedKey && chatReady) {
      fetchAndDecryptMessages(sharedKey);
    }
  }, [sharedKey, chatReady, fetchAndDecryptMessages]);

  // ─── Supabase Realtime para chat ───
  useEffect(() => {
    if (!chatReady || !sharedKey) return;

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`chat:${cuentaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes_chat',
          filter: `cuenta_corriente_id=eq.${cuentaId}`,
        },
        async (payload) => {
          const msg = payload.new as MensajeChat;
          try {
            const texto = await decryptMessage(
              sharedKey,
              msg.texto_encriptado,
              msg.iv,
            );
            setMensajes((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [
                ...prev,
                {
                  id: msg.id,
                  remitente_id: msg.remitente_id,
                  texto,
                  created_at: msg.created_at,
                },
              ];
            });
          } catch {
            // Can't decrypt
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cuentaId, chatReady, sharedKey]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  // ─── Enviar mensaje ───
  async function handleSendChat(e: FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || !sharedKey) return;

    setSendingChat(true);
    try {
      const { ciphertext, iv } = await encryptMessage(sharedKey, chatInput.trim());
      await apiFetch(`/cuentas-corrientes/${cuentaId}/mensajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto_encriptado: ciphertext, iv }),
      });
      setChatInput('');
    } catch {
      // silent
    } finally {
      setSendingChat(false);
    }
  }

  // ─── Iniciar flujo Payment Brick ───
  async function initPaymentBrick(amount: number) {
    if (!MP_PUBLIC_KEY) {
      setPagoError('Falta configurar NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY');
      return;
    }

    try {
      const { loadMercadoPago } = await import('@mercadopago/sdk-js');
      await loadMercadoPago();
      const mp = new (window as any).MercadoPago(MP_PUBLIC_KEY, { locale: 'es-AR' });
      const bricksBuilder = mp.bricks();

      brickControllerRef.current = await bricksBuilder.create(
        'cardPayment',
        'mp-card-brick',
        {
          initialization: { amount },
          customization: {
            visual: {
              style: { theme: 'dark' },
              texts: { formSubmit: 'Pagar' },
            },
          },
          callbacks: {
            onSubmit: async (cardFormData: any) => {
              setPagando(true);
              setPagoError(null);
              try {
                const result = await apiFetch<MercadoPagoResult>(
                  `/cuentas-corrientes/${cuentaId}/mercado-pago`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      token: cardFormData.token,
                      payment_method_id: cardFormData.payment_method_id,
                      transaction_amount: cardFormData.transaction_amount,
                      installments: cardFormData.installments,
                      issuer_id: cardFormData.issuer_id
                        ? String(cardFormData.issuer_id)
                        : undefined,
                      payer_email: cardFormData.payer?.email ?? '',
                      payer_identification_type:
                        cardFormData.payer?.identification?.type,
                      payer_identification_number:
                        cardFormData.payer?.identification?.number,
                      receptor_id: cuenta!.contraparte.id,
                      descripcion: pagoDesc || undefined,
                    }),
                  },
                );
                setPagoResultado(result);
                setPagoStep('resultado');
                fetchTransacciones();
                fetchCuenta();
              } catch (err: any) {
                setPagoError(err.message);
              } finally {
                setPagando(false);
              }
            },
            onReady: () => {},
            onError: (error: any) => {
              console.error('MP Brick error:', error);
            },
          },
        },
      );
    } catch (err: any) {
      setPagoError(`Error al cargar Mercado Pago: ${err.message}`);
    }
  }

  function handleContinuarAlPago(e: FormEvent) {
    e.preventDefault();
    if (!pagoMonto) return;
    setPagoStep('tarjeta');
    setPagoError(null);
    setTimeout(() => initPaymentBrick(parseFloat(pagoMonto)), 100);
  }

  // ─── Pagar factura pendiente con Mercado Pago ───
  function handlePagarFactura(tx: Transaccion) {
    if (!cuenta) return;
    setPagoMonto(String(tx.monto));
    setPagoDesc(`Pago factura - ${tx.descripcion || ''}`);
    setPagoStep('tarjeta');
    setPagoError(null);
    setPagoResultado(null);
    setShowPagoModal(true);
    setTimeout(() => initPaymentBrick(tx.monto), 200);
  }

  function closePagoModal() {
    brickControllerRef.current?.unmount?.();
    brickControllerRef.current = null;
    setShowPagoModal(false);
    setPagoStep('monto');
    setPagoMonto('');
    setPagoDesc('');
    setPagoError(null);
    setPagoResultado(null);
  }

  // ─── Escanear factura ───
  async function handleEscanearFactura() {
    if (!facturaFile) return;
    setEscaneando(true);
    setFacturaResult(null);
    try {
      const formData = new FormData();
      formData.append('factura', facturaFile);
      const token = getToken();
      const res = await fetch(
        `${BACKEND_URL}/cuentas-corrientes/${cuentaId}/escanear-factura`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: 'Error' }));
        throw new Error(body.message);
      }
      const result: FacturaEscaneada = await res.json();
      setFacturaResult(result);
      if (result.monto_total) {
        setFacturaMontoConfirmado(result.monto_total.toString());
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setEscaneando(false);
    }
  }

  // ─── Enviar factura como transacción ───
  async function handleEnviarFactura(e: FormEvent) {
    e.preventDefault();
    if (!cuenta || !facturaMontoConfirmado) return;
    setEnviandoFactura(true);
    try {
      await apiFetch(`/cuentas-corrientes/${cuentaId}/transaccion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto: parseFloat(facturaMontoConfirmado),
          tipo: 'FACTURA',
          receptor_id: cuenta.contraparte.id,
          descripcion: 'Factura escaneada',
          url_factura: facturaResult?.url_factura ?? undefined,
        }),
      });
      setShowFacturaModal(false);
      setFacturaFile(null);
      setFacturaResult(null);
      setFacturaMontoConfirmado('');
      fetchTransacciones();
      fetchCuenta();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setEnviandoFactura(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center pb-20 pt-6">
        <div className="size-8 animate-spin rounded-full border-2 border-zinc-600 border-t-indigo-500" />
      </div>
    );
  }

  if (error || !cuenta) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 pb-20 pt-6">
        <p className="text-sm text-red-400">{error || 'Cuenta no encontrada'}</p>
        <button
          onClick={() => router.push('/cuentas')}
          className="text-sm text-indigo-400 underline"
        >
          Volver
        </button>
      </div>
    );
  }

  const saldoPositivo = cuenta.saldo_relativo > 0;
  const saldoNegativo = cuenta.saldo_relativo < 0;

  return (
    <div className="flex flex-1 flex-col pb-36 pt-4">
      <div className="mx-auto w-full max-w-lg px-4">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/cuentas')}
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-zinc-100">
              {cuenta.contraparte.nombre || cuenta.contraparte.email}
            </h1>
            <p className="text-xs text-zinc-500">
              DNI: {cuenta.contraparte.dni || '—'}
            </p>
          </div>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-600/20 text-sm font-bold text-indigo-400">
            {(cuenta.contraparte.nombre || cuenta.contraparte.email)
              .charAt(0)
              .toUpperCase()}
          </div>
        </div>

        {/* Balance Card */}
        <div
          className={`mb-6 rounded-2xl border p-5 ${
            saldoPositivo
              ? 'border-emerald-500/20 bg-emerald-500/5'
              : saldoNegativo
                ? 'border-red-500/20 bg-red-500/5'
                : 'border-zinc-500/20 bg-zinc-500/5'
          }`}
        >
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-400">
            Balance
          </p>
          <p
            className={`text-3xl font-bold ${
              saldoPositivo
                ? 'text-emerald-400'
                : saldoNegativo
                  ? 'text-red-400'
                  : 'text-zinc-400'
            }`}
          >
            {formatSaldo(cuenta.saldo_relativo)}
          </p>
          <p
            className={`mt-1 text-sm ${
              saldoPositivo
                ? 'text-emerald-500/70'
                : saldoNegativo
                  ? 'text-red-500/70'
                  : 'text-zinc-500'
            }`}
          >
            {saldoPositivo
              ? 'Te debe'
              : saldoNegativo
                ? 'Le debés'
                : 'Sin saldo pendiente'}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex rounded-xl border border-white/10 bg-white/5 p-1">
          <button
            onClick={() => setTab('historial')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${
              tab === 'historial'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Historial
          </button>
          <button
            onClick={() => setTab('chat')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${
              tab === 'chat'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Chat
          </button>
        </div>

        {/* ─── Tab: Historial ─── */}
        {tab === 'historial' && (
          <div>
            {loadingTx ? (
              <div className="flex justify-center py-8">
                <div className="size-6 animate-spin rounded-full border-2 border-zinc-600 border-t-indigo-500" />
              </div>
            ) : transacciones.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-zinc-500">
                  No hay transacciones aún.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {transacciones.map((tx) => {
                  const esEmisor = tx.emisor_id === userId;
                  const esPago = tx.tipo === 'PAGO';
                  const pendiente = tx.estado === 'PENDIENTE';

                  return (
                    <div
                      key={tx.id}
                      className="rounded-xl border border-white/10 bg-white/5 p-4"
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
                                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                                <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-200">
                              {esPago ? 'Pago' : 'Factura'}
                              {tx.descripcion && (
                                <span className="ml-1 text-zinc-500">
                                  · {tx.descripcion}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {formatDate(tx.created_at)} ·{' '}
                              {esEmisor ? 'Enviado' : 'Recibido'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-sm font-semibold ${
                              esPago ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {formatSaldo(tx.monto)}
                          </p>
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
                      {tx.tipo === 'FACTURA' && pendiente && tx.receptor_id === userId && (
                        <button
                          onClick={() => handlePagarFactura(tx)}
                          className="mt-3 w-full rounded-lg bg-sky-600 py-2 text-sm font-medium text-white transition hover:bg-sky-500"
                        >
                          Pagar con Mercado Pago
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Tab: Chat ─── */}
        {tab === 'chat' && (
          <div className="flex flex-col">
            {/* E2EE badge */}
            <div className="mb-3 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5 text-emerald-400">
                <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium text-emerald-400">
                Encriptado de extremo a extremo
              </span>
            </div>

            {!chatReady ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-3 size-8 animate-spin rounded-full border-2 border-zinc-600 border-t-indigo-500" />
                <p className="text-sm text-zinc-400">
                  Estableciendo canal seguro...
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  Se necesita que ambos usuarios abran el chat al menos una vez.
                </p>
              </div>
            ) : (
              <>
                {/* Messages */}
                <div className="mb-3 max-h-[50vh] space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-white/[.02] p-3">
                  {mensajes.length === 0 && (
                    <p className="py-8 text-center text-sm text-zinc-500">
                      No hay mensajes aún. Iniciá la conversación.
                    </p>
                  )}
                  {mensajes.map((m) => {
                    const esMio = m.remitente_id === userId;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                            esMio
                              ? 'rounded-br-md bg-indigo-600 text-white'
                              : 'rounded-bl-md bg-zinc-800 text-zinc-200'
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{m.texto}</p>
                          <p
                            className={`mt-1 text-[10px] ${
                              esMio ? 'text-indigo-200/60' : 'text-zinc-500'
                            }`}
                          >
                            {new Date(m.created_at).toLocaleTimeString('es-AR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSendChat} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Escribí un mensaje..."
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={sendingChat || !chatInput.trim()}
                    className="rounded-xl bg-indigo-600 px-4 py-3 text-white transition hover:bg-indigo-500 disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                      <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
                    </svg>
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </div>

      {/* ─── Bottom Actions ─── */}
      <div className="fixed bottom-16 left-0 right-0 z-40 border-t border-white/10 bg-zinc-950/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button
            onClick={() => {
              setPagoMonto('');
              setPagoDesc('');
              setPagoStep('monto');
              setPagoError(null);
              setPagoResultado(null);
              setShowPagoModal(true);
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
              <path fillRule="evenodd" d="M1 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4Zm12 4a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM4 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm13-1a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" clipRule="evenodd" />
            </svg>
            Realizar Pago
          </button>
          <button
            onClick={() => {
              setFacturaFile(null);
              setFacturaResult(null);
              setFacturaMontoConfirmado('');
              setShowFacturaModal(true);
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
              <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm4.75 5.75a.75.75 0 0 0-1.5 0v2h-2a.75.75 0 0 0 0 1.5h2v2a.75.75 0 0 0 1.5 0v-2h2a.75.75 0 0 0 0-1.5h-2v-2Z" clipRule="evenodd" />
            </svg>
            Subir Factura
          </button>
        </div>
      </div>

      {/* ─── Modal: Realizar Pago ─── */}
      {showPagoModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closePagoModal}
          />
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl sm:rounded-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-100">
                {pagoStep === 'resultado' ? 'Resultado del Pago' : 'Realizar Pago'}
              </h2>
              <button
                onClick={closePagoModal}
                className="rounded-lg p-1 text-zinc-500 transition hover:bg-white/10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            {pagoError && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-400">
                {pagoError}
              </div>
            )}

            {/* Step 1: Monto */}
            {pagoStep === 'monto' && (
              <form onSubmit={handleContinuarAlPago} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                    Monto (ARS)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={pagoMonto}
                    onChange={(e) => setPagoMonto(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                    Descripción (opcional)
                  </label>
                  <input
                    type="text"
                    value={pagoDesc}
                    onChange={(e) => setPagoDesc(e.target.value)}
                    placeholder="Motivo del pago"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!pagoMonto}
                  className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  Continuar al pago
                </button>
              </form>
            )}

            {/* Step 2: MercadoPago Card Payment Brick */}
            {pagoStep === 'tarjeta' && (
              <div>
                <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-zinc-400">Monto a pagar</p>
                  <p className="text-xl font-bold text-indigo-400">
                    {formatSaldo(parseFloat(pagoMonto))}
                  </p>
                </div>

                {pagando && (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <span className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span className="text-sm text-zinc-400">Procesando pago...</span>
                  </div>
                )}

                <div id="mp-card-brick" ref={mpBrickRef} />

                <button
                  type="button"
                  onClick={() => {
                    brickControllerRef.current?.unmount?.();
                    brickControllerRef.current = null;
                    setPagoStep('monto');
                  }}
                  className="mt-4 w-full rounded-lg border border-white/10 py-2 text-sm text-zinc-400 transition hover:bg-white/10"
                >
                  Volver
                </button>
              </div>
            )}

            {/* Step 3: Resultado */}
            {pagoStep === 'resultado' && pagoResultado && (
              <div className="space-y-4">
                <div
                  className={`rounded-xl p-6 text-center ${
                    pagoResultado.status === 'approved'
                      ? 'bg-emerald-500/10'
                      : pagoResultado.status === 'pending' || pagoResultado.status === 'in_process'
                        ? 'bg-amber-500/10'
                        : 'bg-red-500/10'
                  }`}
                >
                  {pagoResultado.status === 'approved' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="mx-auto mb-3 size-12 text-emerald-400">
                      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`mx-auto mb-3 size-12 ${pagoResultado.status === 'pending' || pagoResultado.status === 'in_process' ? 'text-amber-400' : 'text-red-400'}`}>
                      <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clipRule="evenodd" />
                    </svg>
                  )}
                  <p className={`text-lg font-bold ${
                    pagoResultado.status === 'approved'
                      ? 'text-emerald-400'
                      : pagoResultado.status === 'pending' || pagoResultado.status === 'in_process'
                        ? 'text-amber-400'
                        : 'text-red-400'
                  }`}>
                    {pagoResultado.status === 'approved'
                      ? 'Pago aprobado'
                      : pagoResultado.status === 'pending' || pagoResultado.status === 'in_process'
                        ? 'Pago pendiente'
                        : 'Pago rechazado'}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {pagoResultado.status_detail}
                  </p>
                </div>
                <button
                  onClick={closePagoModal}
                  className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Modal: Subir Factura ─── */}
      {showFacturaModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowFacturaModal(false)}
          />
          <div className="relative w-full max-w-md rounded-t-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl sm:rounded-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-100">
                Subir Factura
              </h2>
              <button
                onClick={() => setShowFacturaModal(false)}
                className="rounded-lg p-1 text-zinc-500 transition hover:bg-white/10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            {/* Upload */}
            {!facturaResult && (
              <div className="space-y-4">
                <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-white/10 p-8 transition hover:border-indigo-500/50 hover:bg-white/[.02]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="size-10 text-zinc-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  <div className="text-center">
                    <p className="text-sm font-medium text-zinc-300">
                      {facturaFile ? facturaFile.name : 'Seleccionar archivo'}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">PDF (máx. 10MB)</p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) =>
                      setFacturaFile(e.target.files?.[0] ?? null)
                    }
                  />
                </label>

                <button
                  onClick={handleEscanearFactura}
                  disabled={!facturaFile || escaneando}
                  className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  {escaneando ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Analizando factura...
                    </span>
                  ) : (
                    'Escanear Factura'
                  )}
                </button>
              </div>
            )}

            {/* Result */}
            {facturaResult && (
              <form onSubmit={handleEnviarFactura} className="space-y-4">
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-zinc-300">
                      Monto detectado
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        facturaResult.confianza === 'alta'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : facturaResult.confianza === 'media'
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      Confianza {facturaResult.confianza}
                    </span>
                  </div>
                  {facturaResult.monto_total ? (
                    <p className="mt-1 text-2xl font-bold text-indigo-400">
                      {formatSaldo(facturaResult.monto_total)}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-red-400">
                      No se pudo detectar el monto automáticamente.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                    Monto a enviar (ARS)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={facturaMontoConfirmado}
                    onChange={(e) => setFacturaMontoConfirmado(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFacturaResult(null);
                      setFacturaFile(null);
                    }}
                    className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/10"
                  >
                    Reintentar
                  </button>
                  <button
                    type="submit"
                    disabled={enviandoFactura || !facturaMontoConfirmado}
                    className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {enviandoFactura ? 'Enviando...' : 'Confirmar y Enviar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
