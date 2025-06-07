export const TEAM_CONSTANTS = {
  OBJECT_ID_LENGTH: 24,
  MAX_LOGO_FILE_SIZE: 1024 * 1024, // 1MB
  UPLOADS_DIRECTORY: './uploads',
  LOGO_URL_PREFIX: 'http://localhost:3000/uploads',
} as const;

export const SOUTH_AMERICAN_COUNTRIES = [
  'argentina',
  'brasil',
  'bolivia',
  'chile',
  'colombia',
  'ecuador',
  'paraguay',
  'perú',
  'uruguay',
  'venezuela',
] as const;

export const BOMBOS = [1, 2, 3, 4] as const;

export const QUALIFYING_ENTRY_STAGES = [1, 2, 3] as const;

export type SouthAmericanCountry = (typeof SOUTH_AMERICAN_COUNTRIES)[number];
export type BomboType = (typeof BOMBOS)[number];
export type QualifyingEntryStage = (typeof QUALIFYING_ENTRY_STAGES)[number];