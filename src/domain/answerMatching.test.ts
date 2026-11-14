import { describe, expect, it } from 'vitest';
import { isAcceptedAnswer, levenshtein } from './answerMatching';

describe('free-text answers', () => {
  it('ignores case, punctuation, spaces and leading articles', () => {
    expect(isAcceptedAnswer('  Et JULETRE! ', ['juletre'])).toBe(true);
    expect(isAcceptedAnswer('Mandel i grøten', ['mandel i grøten'])).toBe(true);
    expect(isAcceptedAnswer('mandeligrøten', ['mandel i grøten'])).toBe(true);
  });

  it('forgives small typos in longer words', () => {
    expect(isAcceptedAnswer('juletr', ['juletre'])).toBe(true);
    expect(isAcceptedAnswer('rensdyr', ['reinsdyr'])).toBe(true);
    expect(isAcceptedAnswer('stjerne på topen', ['stjerne på toppen'])).toBe(true);
  });

  it('is strict on short words and wrong answers', () => {
    expect(isAcceptedAnswer('gren', ['gran'])).toBe(false);
    expect(isAcceptedAnswer('pepperkake', ['juletre'])).toBe(false);
    expect(isAcceptedAnswer('', ['juletre'])).toBe(false);
  });

  it('accepts any of the listed variants', () => {
    expect(isAcceptedAnswer('fotsteg', ['fotspor', 'fotsteg'])).toBe(true);
  });

  it('computes edit distance', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('', 'abc')).toBe(3);
  });
});
