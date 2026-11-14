// Krypterer GitHub-tokenet med det felles passordet.
// Bruk: DATA_TOKEN=github_pat_xxx APP_PASSWORD=pepperkake node scripts/encrypt-token.mjs
// Skriver ut en linje VITE_ENC_TOKEN=... (samme format som src/lib/crypto.ts)
const { DATA_TOKEN, APP_PASSWORD } = process.env
if (!DATA_TOKEN || !APP_PASSWORD) {
  console.error('Mangler DATA_TOKEN eller APP_PASSWORD')
  process.exit(1)
}
const enc = new TextEncoder()
const salt = crypto.getRandomValues(new Uint8Array(16))
const iv = crypto.getRandomValues(new Uint8Array(12))
const base = await crypto.subtle.importKey('raw', enc.encode(APP_PASSWORD), 'PBKDF2', false, ['deriveKey'])
const key = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations: 200_000, hash: 'SHA-256' },
  base,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt'],
)
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(DATA_TOKEN)))
console.log('VITE_ENC_TOKEN=' + Buffer.concat([salt, iv, ct]).toString('base64'))
