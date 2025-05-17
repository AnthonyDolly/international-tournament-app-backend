import { Types } from 'mongoose';
import { QualifyingStage } from '../entities/qualifying-stage.entity';

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

export interface QualifyingStageWithRelations {
  _id: Types.ObjectId;
  tournament: TournamentInfo;
  firstTeam: TeamWithInfo;
  secondTeam: TeamWithInfo;
  firstTeamAggregateGoals: number;
  secondTeamAggregateGoals: number;
  matchDate: Date;
  stadium: string;
  status: string;
}

export type QualifyingStageResponse = Omit<
  QualifyingStage,
  'tournamentId' | 'firstTeamId' | 'secondTeamId'
> &
  QualifyingStageWithRelations;
