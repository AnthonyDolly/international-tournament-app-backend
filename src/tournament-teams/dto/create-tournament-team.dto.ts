import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  BOMBOS,
  BomboType,
  QUALIFYING_ENTRY_STAGES,
  QualifyingEntryStage,
} from '../constants/tournament.constants';

export class CreateTournamentTeamDto {
  @IsMongoId({ message: 'team must be a valid MongoDB ObjectId' })
  teamId: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  ranking: number;

  @IsNumber()
  @IsNotEmpty()
  points: number;

  @IsIn(BOMBOS, {
    message: 'bombo must be one of the values: 1, 2, 3, or 4',
  })
  @IsNotEmpty()
  bombo: BomboType;

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

export class CreateTournamentTeamsDto {
  @IsMongoId({ message: 'tournament must be a valid MongoDB ObjectId' })
  tournamentId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTournamentTeamDto)
  teams: CreateTournamentTeamDto[];
}
