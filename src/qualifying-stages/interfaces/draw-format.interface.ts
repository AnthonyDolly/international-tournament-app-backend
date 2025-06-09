interface TeamData {
  name: string;
  logo: string | null;
  originalId: string;
}

export interface DrawFormatMatch {
  id: string;
  matchNumber: number;
  firstTeam: TeamData;
  secondTeam: TeamData;
  winnerPlaceholder?: string;
  winnerTeam?: TeamData;
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
