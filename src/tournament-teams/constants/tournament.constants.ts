export const TOURNAMENT_CONSTANTS = {
  REQUIRED_TEAMS_FOR_GROUP_STAGE: 32,
  NUMBER_OF_GROUPS: 8,
  TEAMS_PER_GROUP: 4,
  MAX_DRAW_ATTEMPTS: 100,
  MAX_ASSIGNMENT_ATTEMPTS: 1000,
  LOG_INTERVAL: 10,
  OBJECT_ID_LENGTH: 24,
} as const;

export const GROUP_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

export const BOMBOS = [1, 2, 3, 4] as const;

export const QUALIFYING_ENTRY_STAGES = [1, 2, 3] as const;

export type BomboType = (typeof BOMBOS)[number];
export type QualifyingEntryStage = (typeof QUALIFYING_ENTRY_STAGES)[number];
