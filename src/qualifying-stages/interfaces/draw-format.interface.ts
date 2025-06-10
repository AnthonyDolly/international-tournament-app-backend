interface TeamInfo {
  name: string;
  country: string | null;
  logo: string | null;
}

interface TeamData {
  _id: string | null;
  teamInfo: TeamInfo;
}

interface MatchData {
  _id: string;
  stage: string;
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number;
  awayGoals: number;
  matchDate: string;
  stadium: string;
  matchType: string;
  qualifyingStageId: string;
  status: string;
}

export interface DrawFormatMatch {
  // Original qualifying stage properties
  _id: string;
  qualifyingStage: number;
  firstTeamAggregateGoals: number;
  secondTeamAggregateGoals: number;
  firstLegPlayed: boolean;
  secondLegPlayed: boolean;
  penaltiesPlayed: boolean;
  firstTeamPenaltyGoals: number | null;
  secondTeamPenaltyGoals: number | null;

  // Team data with full info
  firstTeam: TeamData;
  secondTeam: TeamData;
  winnerTeam: TeamData | null;

  // Match details
  firstLegMatch: MatchData | null;
  secondLegMatch: MatchData | null;

  // Draw format properties
  id: string;
  matchNumber: number;
  stage: number;
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
