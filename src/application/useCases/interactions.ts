import type { ParticipantId } from '../../domain/types';
import type { InteractionRepository, ParticipantRepository } from '../ports';

export interface InteractionDeps {
  interactions: InteractionRepository;
  participants: ParticipantRepository;
}

export interface FriendEntry {
  participantId: ParticipantId;
  name: string;
  count: number;
  rank: number;
}

/** Every tickle and cookie counts – batched so we don't write on every click. */
export function recordInteractions(deps: InteractionDeps, participantId: ParticipantId, count: number): Promise<void> {
  return deps.interactions.add(participantId, count);
}

/** «Nissevenner»: who has played the most with the nisser and reindeer. Separate from the quiz points. */
export async function getFriendsBoard(deps: InteractionDeps): Promise<FriendEntry[]> {
  const [participants, counts] = await Promise.all([deps.participants.findAll(), deps.interactions.findAll()]);
  const byId = new Map(counts.map((c) => [c.participantId, c.count]));
  const sorted = participants
    .map((p) => ({ participantId: p.id, name: p.name, count: byId.get(p.id) ?? 0 }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'nb'));
  return sorted.map((e) => ({ ...e, rank: sorted.findIndex((o) => o.count === e.count) + 1 }));
}
