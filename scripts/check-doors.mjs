#!/usr/bin/env node
/**
 * Fails if public/doors.json can't be unlocked with APP_PASSWORD –
 * catches «forgot to re-publish after changing the password» before deploy.
 *
 *   APP_PASSWORD=hemmelig node scripts/check-doors.mjs
 */
import { readFileSync } from 'node:fs';

const password = process.env.APP_PASSWORD;
if (!password) {
  console.error('Mangler APP_PASSWORD');
  process.exit(1);
}
const { keySalt, doors } = JSON.parse(readFileSync('public/doors.json', 'utf8'));
const enc = new TextEncoder();
const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt: Buffer.from(keySalt, 'base64'), iterations: 200_000, hash: 'SHA-256' },
  base,
  { name: 'AES-GCM', length: 256 },
  false,
  ['decrypt'],
);
let ok = 0;
for (const door of doors.filter((d) => d.answerCipher)) {
  const data = Buffer.from(door.answerCipher, 'base64');
  try {
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: data.subarray(0, 12) }, key, data.subarray(12));
    ok += 1;
  } catch {
    console.error(`❌ Luke ${door.day}: fasiten kan ikke låses opp med APP_PASSWORD. Kjør «npm run publish-doors» med riktig passord og commit public/doors.json.`);
    process.exit(1);
  }
}
console.log(`✅ ${ok} fasiter kan låses opp med passordet.`);
