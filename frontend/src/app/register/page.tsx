'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';

interface ApiError {
  message: string | string[];
  statusCode: number;
}

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dni, setDni] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, dni }),
      });

      if (!res.ok) {
        const body: ApiError = await res.json();
        const msg = Array.isArray(body.message)
          ? body.message.join(', ')
          : body.message;
        setError(msg);
        return;
      }

      setSuccess(true);
    } catch {
      setError('Error de conexion con el servidor');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-green-500/30 bg-green-950/20 p-8 text-center">
          <h2 className="mb-2 text-2xl font-bold text-green-400">Cuenta creada</h2>
          <p className="mb-6 text-sm text-green-300/80">
            Tu cuenta fue registrada exitosamente.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-lg bg-white px-6 py-2 text-sm font-medium text-black transition hover:bg-gray-200"
          >
            Iniciar sesion
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur"
      >
        <h1 className="text-center text-2xl font-bold tracking-tight">Crear cuenta</h1>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="dni" className="block text-sm font-medium text-gray-300">
            D.N.I.
          </label>
          <input
            id="dni"
            type="text"
            required
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            placeholder="12345678"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm font-medium text-gray-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm font-medium text-gray-300">
            Contrasena
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 6 caracteres"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Registrando...' : 'Registrarse'}
        </button>

        <p className="text-center text-sm text-gray-400">
          Ya tenes cuenta?{' '}
          <Link href="/login" className="text-indigo-400 hover:underline">
            Iniciar sesion
          </Link>
        </p>
      </form>
    </main>
  );
}
