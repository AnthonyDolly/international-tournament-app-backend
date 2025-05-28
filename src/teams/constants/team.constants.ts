export const TEAM_CONSTANTS = {
  OBJECT_ID_LENGTH: 24,
  MAX_LOGO_FILE_SIZE: 1024 * 1024, // 1MB
  UPLOADS_DIRECTORY: './uploads',
  LOGO_URL_PREFIX: 'http://localhost:3000/uploads',
} as const;

export const SOUTH_AMERICAN_COUNTRIES = [
  'argentina',
  'brasil',
  'chile',
  'colombia',
  'ecuador',
  'paraguay',
  'perú',
  'uruguay',
  'venezuela',
  'bolivia',
] as const;

export const BOMBOS = [1, 2, 3, 4] as const;

export type SouthAmericanCountry = (typeof SOUTH_AMERICAN_COUNTRIES)[number];
export type BomboType = (typeof BOMBOS)[number];
