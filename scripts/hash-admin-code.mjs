#!/usr/bin/env node
/** Prints the SHA-256 of an admin code, for the VITE_ADMIN_CODE_HASH secret. */
import { createHash } from 'node:crypto';

const code = process.argv[2];
if (!code) {
  console.error('Usage: node scripts/hash-admin-code.mjs <code>');
  process.exit(1);
}
console.log(createHash('sha256').update(code.trim()).digest('hex'));
