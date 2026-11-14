import { describe, expect, it } from 'vitest';
import { participantIdFromName, validateParticipantName } from './participantName';

describe('participant names', () => {
  it('trims and collapses whitespace, and derives an id', () => {
    expect(validateParticipantName('  Bestemor   Åse ')).toEqual({ valid: true, name: 'Bestemor Åse', id: 'bestemor-aase' });
  });

  it('rejects names that are too short or too long', () => {
    expect(validateParticipantName('A').valid).toBe(false);
    expect(validateParticipantName('x'.repeat(31)).valid).toBe(false);
  });

  it('rejects names with only symbols', () => {
    expect(validateParticipantName('🎄🎄').valid).toBe(false);
  });

  it('gives the same id regardless of case and Norwegian letters', () => {
    expect(participantIdFromName('Ærlige Øystein')).toBe(participantIdFromName('ærlige øystein'));
    expect(participantIdFromName('Ærlige Øystein')).toBe('aerlige-oeystein');
  });
});
