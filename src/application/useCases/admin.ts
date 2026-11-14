import type { ParticipantId } from '../../domain/types';
import type { AdminAuthenticator, ParticipantRepository } from '../ports';

export interface AdminDeps {
  authenticator: AdminAuthenticator;
  participants: ParticipantRepository;
}

export function authenticateAdmin(deps: AdminDeps, code: string): Promise<boolean> {
  return deps.authenticator.verify(code);
}

/** Removes a participant together with all their answers. */
export function removeParticipant(deps: AdminDeps, id: ParticipantId): Promise<void> {
  return deps.participants.remove(id);
}

/** Forgotten password: the next password they log in with becomes their new one. */
export async function resetPassword(deps: AdminDeps, id: ParticipantId): Promise<void> {
  const participant = await deps.participants.findById(id);
  if (!participant) return;
  const { passwordHash: _removed, ...withoutPassword } = participant;
  void _removed;
  await deps.participants.save(withoutPassword);
}
