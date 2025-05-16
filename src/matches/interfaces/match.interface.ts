import { Types } from 'mongoose';
import { Match } from '../entities/match.entity';

export interface TeamInfo {
  name: string;
  logo: string;
  _id: Types.ObjectId;
}

export interface TeamWithInfo {
  _id: Types.ObjectId;
  team: TeamInfo;
}

export interface TournamentInfo {
  name: string;
  year: number;
  _id: Types.ObjectId;
}

export interface MatchWithRelations {
  _id: Types.ObjectId;
  tournament: TournamentInfo;
  matchDate: Date;
  homeTeam: TeamWithInfo;
  awayTeam: TeamWithInfo;
  homeGoals: number;
  awayGoals: number;
  stage: string;
  group: string;
  matchDay: number;
  matchType: string;
  stadium: string;
  status: string;
}

export type MatchResponse = Omit<
  Match,
  'tournamentId' | 'homeTeamId' | 'awayTeamId'
> &
  MatchWithRelations;
