export interface DrawFormatMatch {
  id: string;
  matchNumber: number;
  firstTeam: any;
  secondTeam: any;
  winnerPlaceholder?: string;
  winnerTeam?: any;
  stage: number;
  firstTeamAggregateGoals?: number;
  secondTeamAggregateGoals?: number;
  firstLegPlayed?: boolean;
  secondLegPlayed?: boolean;
  penaltiesPlayed?: boolean;
  firstTeamPenaltyGoals?: number;
  secondTeamPenaltyGoals?: number;
}

export interface DrawFormatResult {
  phase1: DrawFormatMatch[];
  phase2: DrawFormatMatch[];
  phase3: DrawFormatMatch[];
  summary: {
    totalMatches: number;
    phase1Matches: number;
    phase2Matches: number;
    phase3Matches: number;
    completedMatches: number;
    pendingMatches: number;
  };
} 