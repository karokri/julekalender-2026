import type { AdminAuthenticator, Clock, Hasher, PasswordHasher } from '../application/ports';
import { b64ToBytes, bytesToB64 } from './crypto';
import { fromIsoDate, toIsoDate } from '../domain/calendar';
import type { CalendarDate } from '../domain/types';
import type { KeyValueStorage } from './storage';

export class ZonedClock implements Clock {
  private readonly timeZone: string;
  private readonly now: () => Date;

  constructor(timeZone: string, now: () => Date = () => new Date()) {
    this.timeZone = timeZone;
    this.now = now;
  }

  today(): CalendarDate {
    // The sv-SE locale formats as YYYY-MM-DD.
    const iso = new Intl.DateTimeFormat('sv-SE', { timeZone: this.timeZone }).format(this.now());
    return fromIsoDate(iso);
  }

  nowIso(): string {
    return this.now().toISOString();
  }
}

/** Lets an admin pretend it is another date — handy for testing doors before December. */
export class SimulatableClock implements Clock {
  private static readonly KEY = 'jul.simulatedDate';
  private readonly realClock: Clock;
  private readonly storage: KeyValueStorage;

  private readonly fallbackDate?: CalendarDate;

  constructor(realClock: Clock, storage: KeyValueStorage, fallbackDate?: CalendarDate) {
    this.realClock = realClock;
    this.storage = storage;
    this.fallbackDate = fallbackDate;
  }

  today(): CalendarDate {
    return this.simulatedDate() ?? this.fallbackDate ?? this.realClock.today();
  }

  /** Real time of day, on the simulated date – keeps the speed ranking meaningful while testing. */
  nowIso(): string {
    const real = this.realClock.nowIso();
    const date = this.simulatedDate() ?? this.fallbackDate;
    return date ? `${toIsoDate(date)}${real.slice(10)}` : real;
  }

  simulatedDate(): CalendarDate | undefined {
    const iso = this.storage.getItem(SimulatableClock.KEY);
    return iso ? fromIsoDate(iso) : undefined;
  }

  simulate(date: CalendarDate | undefined): void {
    if (date) this.storage.setItem(SimulatableClock.KEY, toIsoDate(date));
    else this.storage.removeItem(SimulatableClock.KEY);
  }
}

export class WebCryptoHasher implements Hasher {
  async sha256(text: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}

/** Compares the SHA-256 of the entered code with a hash configured at build time. */
export class HashedCodeAuthenticator implements AdminAuthenticator {
  private readonly hasher: Hasher;
  private readonly expectedHash: string;

  constructor(hasher: Hasher, expectedHash: string) {
    this.hasher = hasher;
    this.expectedHash = expectedHash.toLowerCase();
  }

  async verify(code: string): Promise<boolean> {
    return (await this.hasher.sha256(code.trim())) === this.expectedHash;
  }
}

/**
 * Personal passwords: PBKDF2-SHA256 with a random salt, stored as
 * `pbkdf2$<iterations>$<salt>$<hash>` in the participant's file.
 */
export class Pbkdf2PasswordHasher implements PasswordHasher {
  private readonly iterations: number;

  constructor(iterations = 100_000) {
    this.iterations = iterations;
  }

  async hash(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const bits = await derive(password, salt, this.iterations);
    return `pbkdf2$${this.iterations}$${bytesToB64(salt)}$${bytesToB64(bits)}`;
  }

  async verify(password: string, stored: string): Promise<boolean> {
    const [scheme, iterations, salt, expected] = stored.split('$');
    if (scheme !== 'pbkdf2' || !iterations || !salt || !expected) return false;
    const bits = await derive(password, b64ToBytes(salt), Number(iterations));
    return bytesToB64(bits) === expected;
  }
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' }, key, 256);
  return new Uint8Array(bits);
}
