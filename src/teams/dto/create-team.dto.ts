import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { SOUTH_AMERICAN_COUNTRIES, BOMBOS } from '../constants/team.constants';

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(SOUTH_AMERICAN_COUNTRIES, {
    message: 'country must be a valid South American country',
  })
  country: string;

  @IsIn(BOMBOS, {
    message: 'bombo must be one of the values: 1, 2, 3, or 4',
  })
  @IsNotEmpty()
  bombo: number;

  @IsBoolean({
    message: 'isParticipating must be a boolean value',
  })
  @IsOptional()
  isParticipating?: boolean;

  @IsBoolean({
    message: 'isCurrentChampion must be a boolean value',
  })
  @IsOptional()
  isCurrentChampion?: boolean;

  @IsBoolean({
    message: 'isFromQualifiers must be a boolean value',
  })
  @IsOptional()
  isFromQualifiers?: boolean;
}
