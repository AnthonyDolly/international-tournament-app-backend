import { Types } from 'mongoose';
import { SouthAmericanCountry, BomboType } from '../constants/team.constants';

export interface TeamResponse {
  _id: Types.ObjectId;
  name: string;
  country: SouthAmericanCountry;
  bombo: BomboType;
  logo: string | null;
  isParticipating: boolean;
  isCurrentChampion: boolean;
  isFromQualifiers: boolean;
}

export interface PopulatedTeamResponse extends Omit<TeamResponse, 'bombo'> {
  bombo: {
    _id: Types.ObjectId;
    name: string;
  };
}

export interface TeamQueryOptions {
  filters?: Partial<Pick<TeamResponse, 'country' | 'bombo' | 'isCurrentChampion' | 'isFromQualifiers'>>;
  includeInactive?: boolean;
  sortBy?: 'name' | 'country' | 'bombo' | 'isCurrentChampion';
  sortOrder?: 'asc' | 'desc';
} 