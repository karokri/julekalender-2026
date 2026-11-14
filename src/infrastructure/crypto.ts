// AES-GCM with a key derived from the shared password (PBKDF2-SHA256).
// Same format as scripts/encrypt-token.mjs and scripts/publish-doors.mjs:
//   token:  base64(salt[16] | iv[12] | ciphertext)
//   answer: base64(iv[12] | ciphertext), salt stored once in doors.json
export const PBKDF2_ITERATIONS = 200_000;
const enc = new TextEncoder();
const dec = new TextDecoder();

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Throws if the key (i.e. the password) is wrong. */
export async function decryptWithKey(key: CryptoKey, ivAndCiphertext: Uint8Array): Promise<string> {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivAndCiphertext.slice(0, 12) },
    key,
    ivAndCiphertext.slice(12),
  );
  return dec.decode(plain);
}

export async function encryptWithKey(key: CryptoKey, plain: string): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plain)));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return out;
}

/** Decrypts a self-contained blob (salt | iv | ciphertext). Throws on wrong password. */
export async function decryptBlob(blob: string, password: string): Promise<string> {
  const data = b64ToBytes(blob);
  const key = await deriveKey(password, data.slice(0, 16));
  return decryptWithKey(key, data.slice(16));
}

export function bytesToB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64.replace(/\s/g, ''));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export const utf8ToB64 = (s: string) => bytesToB64(enc.encode(s));
export const b64ToUtf8 = (b: string) => dec.decode(b64ToBytes(b));
