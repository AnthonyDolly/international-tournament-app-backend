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
  firstTeamAggregateGoals: number;
  secondTeamAggregateGoals: number;
  winnerTeam: {
    _id: Types.ObjectId;
    team: {
      _id: Types.ObjectId;
      name: string;
      logo: string;
    };
  } | null;
}
