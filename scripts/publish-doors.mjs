#!/usr/bin/env node
/**
 * Turns doors.source.json (with the answers in plain text) into public/doors.json,
 * where every answer key is AES-GCM encrypted with the shared password.
 *
 *   APP_PASSWORD=hemmelig node scripts/publish-doors.mjs [doors.source.json]
 *
 * Without APP_PASSWORD the file is encrypted with «testmodus» (local test mode only).
 * Keep doors.source.json out of git (it is in .gitignore) – it contains the answers.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const OPTION_IDS = 'abcdefgh';
const SCORED = new Set(['quiz', 'riddle', 'dingbat']);
const KINDS = new Set([...SCORED, 'challenge', 'surprise']);
const ITERATIONS = 200_000;

const password = process.env.APP_PASSWORD || 'testmodus';
if (!process.env.APP_PASSWORD) console.warn('⚠️  APP_PASSWORD mangler – krypterer med «testmodus» (kun for lokal testing).');

const sourcePath = process.argv[2] ?? 'doors.source.json';
const { doors } = JSON.parse(readFileSync(sourcePath, 'utf8'));

const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
  base,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt'],
);

async function encrypt(text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text)));
  return Buffer.concat([iv, ct]).toString('base64');
}

const seenDays = new Set();
const published = [];
for (const d of doors) {
  const where = `Luke ${d.day}`;
  if (!Number.isInteger(d.day) || d.day < 1 || d.day > 24) throw new Error(`${where}: dag må være 1–24.`);
  if (seenDays.has(d.day)) throw new Error(`${where}: dagen er brukt to ganger.`);
  seenDays.add(d.day);
  if (!KINDS.has(d.kind)) throw new Error(`${where}: ukjent type «${d.kind}».`);
  if (!d.title) throw new Error(`${where}: mangler tittel.`);

  const id = d.id ?? `luke-${d.day}`;
  const door = { id, day: d.day, kind: d.kind, title: d.title };
  for (const field of ['prompt', 'body', 'lists', 'image', 'imageAlt', 'funFact']) {
    if (d[field] !== undefined) door[field] = d[field];
  }

  if (d.kind === 'quiz') {
    if (!Array.isArray(d.options) || d.options.length < 2) throw new Error(`${where}: quiz trenger minst to alternativer.`);
    const correctOptionId = OPTION_IDS[d.correct];
    if (!correctOptionId || d.correct >= d.options.length) throw new Error(`${where}: ugyldig «correct»-indeks.`);
    door.options = d.options.map((text, i) => ({ id: OPTION_IDS[i], text }));
    door.answerCipher = await encrypt(JSON.stringify({ correctOptionId, display: d.display ?? d.options[d.correct] }));
  } else if (SCORED.has(d.kind)) {
    if (!Array.isArray(d.accepted) || d.accepted.length === 0) throw new Error(`${where}: trenger «accepted»-svar.`);
    door.answerCipher = await encrypt(JSON.stringify({ accepted: d.accepted, display: d.display ?? d.accepted[0] }));
  }
  published.push(door);
}

published.sort((a, b) => a.day - b.day);
const file = { keySalt: Buffer.from(salt).toString('base64'), doors: published };
writeFileSync('public/doors.json', JSON.stringify(file, null, 2) + '\n');
console.log(`✅ Skrev ${published.length} luker til public/doors.json`);
