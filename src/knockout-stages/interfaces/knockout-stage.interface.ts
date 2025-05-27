import { Types } from 'mongoose';

export interface KnockoutStageResponse {
  _id: Types.ObjectId;
  knockoutStage: string;
  tournament: {
    _id: Types.ObjectId;
    name: string;
    year: number;
  };
  firstTeam: {
    _id: Types.ObjectId;
    team: {
      _id: Types.ObjectId;
      name: string;
      logo: string;
    };
  };
  secondTeam: {
    _id: Types.ObjectId;
    team: {
      _id: Types.ObjectId;
      name: string;
      logo: string;
    };
  };
  isSingleMatch: boolean;
  firstTeamGoals: number;
  secondTeamGoals: number;
  firstTeamAggregateGoals: number;
  secondTeamAggregateGoals: number;
  firstLegPlayed: boolean;
  secondLegPlayed: boolean;
  penaltiesPlayed: boolean;
  firstTeamPenaltyGoals: number;
  secondTeamPenaltyGoals: number;
  isCompleted: boolean;
  winnerTeam: {
    _id: Types.ObjectId;
    team: {
      _id: Types.ObjectId;
      name: string;
      logo: string;
    };
  } | null;
  matchType?: string;
  isFinished?: boolean;
}
