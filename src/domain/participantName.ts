export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 30;

export type NameValidation = { valid: true; name: string; id: string } | { valid: false; reason: string };

export function validateParticipantName(raw: string): NameValidation {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < MIN_NAME_LENGTH) {
    return { valid: false, reason: `Navnet må ha minst ${MIN_NAME_LENGTH} tegn.` };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return { valid: false, reason: `Navnet kan ha maks ${MAX_NAME_LENGTH} tegn.` };
  }
  const id = participantIdFromName(name);
  if (!id) return { valid: false, reason: 'Navnet må inneholde minst én bokstav eller ett tall.' };
  return { valid: true, name, id };
}

/**
 * The name *is* the identity: "Bestemor Åse" → "bestemor-aase".
 * Logging in with the same name on another device continues where you left off.
 */
export function participantIdFromName(name: string): string {
  return name
    .trim()
    .toLocaleLowerCase('nb')
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
