export interface KnockoutTeam {
  id: string;
  name: string;
  logo: string | null;
  groupName: string;
  position: number;
  tournamentTeamId: string;
}

export interface KnockoutMatchup {
  matchupId: string;
  firstPlaceTeam: KnockoutTeam;
  secondPlaceTeam: KnockoutTeam;
}

export interface BracketMatchup {
  matchupId: string;
  from: string[];
}

export interface TournamentRound {
  round: string;
  matchups: KnockoutMatchup[] | BracketMatchup[];
}

export interface CompleteBracketResult {
  tournamentId: string;
  rounds: TournamentRound[];
}

export interface QualifiedTeams {
  firstPlaceTeams: KnockoutTeam[];
  secondPlaceTeams: KnockoutTeam[];
}

export interface GroupClassificationTeam {
  tournamentTeamId: string;
  id: string;
  name: string;
  logo: string | null;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface GroupWithTeams {
  group: {
    id: string;
    name: string;
  };
  teams: GroupClassificationTeam[];
}

export interface GroupClassificationResult {
  groups: GroupWithTeams[];
}
