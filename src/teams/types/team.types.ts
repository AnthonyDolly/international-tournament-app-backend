import { Types } from 'mongoose';
import { SouthAmericanCountry } from '../constants/team.constants';

export interface TeamResponse {
  _id: Types.ObjectId;
  name: string;
  country: SouthAmericanCountry;
  logo: string | null;
  isParticipating: boolean;
  isCurrentChampion: boolean;
  isFromQualifyingStage: boolean;
}

export interface PopulatedTeamResponse extends TeamResponse {}
