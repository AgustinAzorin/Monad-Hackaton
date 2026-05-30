'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { Profile } from '@/types/cuenta';

/**
 * Carga el perfil del usuario (incluida su wallet vinculada) y expone linkWallet().
 * La vinculación es global (no por cuenta): PUT /cuentas-corrientes/wallet.
 */
export function useWalletLink() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      const p = await apiFetch<Profile>('/cuentas-corrientes/perfil');
      setProfile(p);
    } catch {
      // sin sesión todavía u otro error: no romper la UI
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const linkWallet = useCallback(
    async (address: string) => {
      setLoading(true);
      setError(null);
      try {
        const p = await apiFetch<Profile>('/cuentas-corrientes/wallet', {
          method: 'PUT',
          body: JSON.stringify({ wallet_address: address }),
        });
        setProfile(p);
        return p;
      } catch (e: any) {
        setError(e?.message ?? 'No se pudo vincular la wallet');
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const linkedAddress = profile?.wallet_address ?? null;

  return { profile, linkedAddress, linkWallet, loading, error, refetch };
}
