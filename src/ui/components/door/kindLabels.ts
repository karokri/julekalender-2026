import type { DoorKind } from '../../../domain/types';

export const KIND_LABELS: Record<DoorKind, string> = {
  quiz: '❓ Quiz',
  riddle: '🤔 Gåte',
  dingbat: '🧩 Dingbat',
  challenge: '🎯 Utfordring',
  surprise: '🎁 Overraskelse',
};
