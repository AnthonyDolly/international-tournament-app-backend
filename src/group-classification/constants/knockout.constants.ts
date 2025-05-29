export const KNOCKOUT_CONSTANTS = {
  ROUNDS: {
    ROUND_OF_16: 'Round of 16',
    QUARTER_FINALS: 'Quarterfinals',
    SEMI_FINALS: 'Semifinals',
    FINAL: 'Final',
  },
  MIN_TEAMS_FOR_KNOCKOUT: 2,
  POSITIONS: {
    FIRST: 1,
    SECOND: 2,
  },
} as const;

export const SORT_CRITERIA = {
  POINTS: 'points',
  GOAL_DIFFERENCE: 'goalDifference',
  GOALS_FOR: 'goalsFor',
} as const;
