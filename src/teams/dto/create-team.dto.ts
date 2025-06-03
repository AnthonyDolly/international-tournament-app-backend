import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  SOUTH_AMERICAN_COUNTRIES,
  SouthAmericanCountry,
  BOMBOS,
  BomboType,
  QUALIFYING_ENTRY_STAGES,
  QualifyingEntryStage,
} from '../constants/team.constants';

export class CreateTeamDto {
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  ranking: number;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(SOUTH_AMERICAN_COUNTRIES, {
    message: 'country must be a valid South American country',
  })
  country: SouthAmericanCountry;

  @IsNumber()
  @IsNotEmpty()
  points: number;

  @IsIn(BOMBOS, {
    message: 'bombo must be one of the values: 1, 2, 3, or 4',
  })
  @IsNotEmpty()
  bombo: BomboType;

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
    message: 'isFromQualifyingStage must be a boolean value',
  })
  @IsOptional()
  isFromQualifyingStage?: boolean;

  @IsIn(QUALIFYING_ENTRY_STAGES, {
    message: 'qualifyingEntryStage must be one of the values: 1, 2, or 3',
  })
  @IsOptional()
  qualifyingEntryStage?: QualifyingEntryStage;
}
