import { toIsoDate } from '../../domain/calendar';
import { validateParticipantName } from '../../domain/participantName';
import type { Participant, ParticipantId } from '../../domain/types';
import { DomainRuleViolation } from '../errors';
import type { Clock, CurrentParticipantStore, ParticipantRepository, PasswordHasher } from '../ports';

export interface ParticipantDeps {
  participants: ParticipantRepository;
  currentParticipant: CurrentParticipantStore;
  passwords: PasswordHasher;
  clock: Clock;
}

export const MIN_PASSWORD_LENGTH = 4;

export type NameLookup =
  /** Nobody has this name yet – choose a personal password to create it. */
  | { status: 'new'; name: string; id: ParticipantId }
  /** Someone has this name – log in with their password (or create one, if they never did). */
  | { status: 'existing'; participant: Participant; hasPassword: boolean };

export async function lookUpName(deps: ParticipantDeps, rawName: string): Promise<NameLookup> {
  const validation = validateParticipantName(rawName);
  if (!validation.valid) throw new DomainRuleViolation(validation.reason);

  const existing = await deps.participants.findById(validation.id);
  if (existing) return { status: 'existing', participant: existing, hasPassword: !!existing.passwordHash };
  return { status: 'new', name: validation.name, id: validation.id };
}

/** First visit: create the participant with their own password. */
export async function createParticipant(deps: ParticipantDeps, rawName: string, password: string): Promise<Participant> {
  const validation = validateParticipantName(rawName);
  if (!validation.valid) throw new DomainRuleViolation(validation.reason);
  assertValidPassword(password);
  if (await deps.participants.findById(validation.id)) {
    throw new DomainRuleViolation(`Navnet «${validation.name}» er allerede tatt.`);
  }

  const participant: Participant = {
    id: validation.id,
    name: validation.name,
    registeredAt: toIsoDate(deps.clock.today()),
    passwordHash: await deps.passwords.hash(password),
  };
  await deps.participants.save(participant);
  deps.currentParticipant.set(participant.id);
  return participant;
}

/**
 * Log in as an existing participant. If they don't have a password yet
 * (e.g. after an admin reset), the password given becomes their new one.
 */
export async function signIn(deps: ParticipantDeps, id: ParticipantId, password: string): Promise<Participant> {
  const participant = await deps.participants.findById(id);
  if (!participant) throw new DomainRuleViolation('Fant ikke deltakeren.');

  if (!participant.passwordHash) {
    assertValidPassword(password);
    const updated = { ...participant, passwordHash: await deps.passwords.hash(password) };
    await deps.participants.save(updated);
    deps.currentParticipant.set(id);
    return updated;
  }

  if (!(await deps.passwords.verify(password, participant.passwordHash))) {
    throw new DomainRuleViolation('Feil passord. Har du glemt det? Be den som styrer kalenderen om å nullstille det.');
  }
  deps.currentParticipant.set(id);
  return participant;
}

export async function changePassword(
  deps: ParticipantDeps,
  id: ParticipantId,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const participant = await signIn(deps, id, currentPassword);
  assertValidPassword(newPassword);
  await deps.participants.save({ ...participant, passwordHash: await deps.passwords.hash(newPassword) });
}

export async function getCurrentParticipant(deps: ParticipantDeps): Promise<Participant | undefined> {
  const id = deps.currentParticipant.get();
  if (!id) return undefined;

  const participant = await deps.participants.findById(id);
  if (!participant) deps.currentParticipant.clear();
  return participant;
}

export function signOut(deps: ParticipantDeps): void {
  deps.currentParticipant.clear();
}

function assertValidPassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new DomainRuleViolation(`Passordet må ha minst ${MIN_PASSWORD_LENGTH} tegn.`);
  }
}
