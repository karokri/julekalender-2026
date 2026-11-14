/**
 * Tolerant comparison of free-text answers, so kids and grandparents
 * aren't punished for capital letters, punctuation, spaces or a small typo.
 */
export function normalizeAnswer(text: string): string {
  return text
    .toLocaleLowerCase('nb')
    .normalize('NFC')
    .replace(/[«»"'`´.,!?;:()\-–—_/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** How many typos we forgive, depending on the length of the expected answer. */
export function allowedTypos(expected: string): number {
  const length = expected.replace(/\s/g, '').length;
  if (length <= 4) return 0;
  if (length <= 8) return 1;
  return 2;
}

/** «Et juletre» and «juletre» are the same answer. */
function compact(text: string): string {
  return normalizeAnswer(text)
    .replace(/^(en|ei|et) /, '')
    .replace(/\s/g, '');
}

export function isAcceptedAnswer(given: string, accepted: readonly string[]): boolean {
  const guess = compact(given);
  if (!guess) return false;
  return accepted.some((candidate) => {
    const expected = compact(candidate);
    return levenshtein(guess, expected) <= allowedTypos(expected);
  });
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return previous[b.length];
}
