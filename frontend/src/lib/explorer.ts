// Helpers para enlazar al explorer de Monad testnet (ver MONAD.md).
export const MONAD_EXPLORER = 'https://testnet.monadscan.com';

export const txUrl = (hash: string) => `${MONAD_EXPLORER}/tx/${hash}`;
export const addrUrl = (addr: string) => `${MONAD_EXPLORER}/address/${addr}`;
