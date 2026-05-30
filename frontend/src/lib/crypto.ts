const ECDH_PARAMS: EcKeyGenParams = { name: 'ECDH', namedCurve: 'P-256' };
const AES_ALGO = 'AES-GCM';
const IV_LENGTH = 12;

export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(ECDH_PARAMS, true, ['deriveKey']);
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey('jwk', key);
  return btoa(JSON.stringify(jwk));
}

export async function importPublicKey(base64: string): Promise<CryptoKey> {
  const jwk = JSON.parse(atob(base64));
  return crypto.subtle.importKey('jwk', jwk, ECDH_PARAMS, true, []);
}

export async function exportPrivateKey(key: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey('jwk', key);
  return btoa(JSON.stringify(jwk));
}

export async function importPrivateKey(base64: string): Promise<CryptoKey> {
  const jwk = JSON.parse(atob(base64));
  return crypto.subtle.importKey('jwk', jwk, ECDH_PARAMS, true, ['deriveKey']);
}

export async function deriveSharedKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: AES_ALGO, length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptMessage(
  key: CryptoKey,
  plaintext: string,
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt(
    { name: AES_ALGO, iv },
    key,
    encoded,
  );
  return {
    ciphertext: bufferToBase64(encrypted),
    iv: bufferToBase64(iv.buffer),
  };
}

export async function decryptMessage(
  key: CryptoKey,
  ciphertext: string,
  iv: string,
): Promise<string> {
  const ivBuffer = base64ToBuffer(iv);
  const dataBuffer = base64ToBuffer(ciphertext);
  const decrypted = await crypto.subtle.decrypt(
    { name: AES_ALGO, iv: ivBuffer },
    key,
    dataBuffer,
  );
  return new TextDecoder().decode(decrypted);
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

const STORAGE_PREFIX = 'e2ee_keypair_';

export function storeKeyPair(
  cuentaId: string,
  pubB64: string,
  privB64: string,
): void {
  localStorage.setItem(`${STORAGE_PREFIX}${cuentaId}_pub`, pubB64);
  localStorage.setItem(`${STORAGE_PREFIX}${cuentaId}_priv`, privB64);
}

export function getStoredKeyPair(
  cuentaId: string,
): { pub: string; priv: string } | null {
  const pub = localStorage.getItem(`${STORAGE_PREFIX}${cuentaId}_pub`);
  const priv = localStorage.getItem(`${STORAGE_PREFIX}${cuentaId}_priv`);
  if (pub && priv) return { pub, priv };
  return null;
}
