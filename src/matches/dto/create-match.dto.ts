import {
  IsDate,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateMatchDto {
  @IsNotEmpty()
  @IsMongoId()
  tournamentId: string;

  @IsNotEmpty()
  @IsMongoId()
  groupId: string;

  @IsNotEmpty()
  @IsIn(['qualifyingStage', 'groupStage', 'knockoutStage'])
  stage: string;

  @IsOptional()
  @IsIn([1, 2, 3, 4, 5, 6])
  matchDay: number;

  @IsNotEmpty()
  @IsMongoId()
  homeTeamId: string;

  @IsNotEmpty()
  @IsMongoId()
  awayTeamId: string;

  @IsNotEmpty()
  @IsDate()
  matchDate: Date;

  @IsNotEmpty()
  @IsString()
  stadium: string;

  @IsOptional()
  @IsIn(['firstLeg', 'secondLeg', 'singleMatch'])
  matchType: string;

  @IsOptional()
  @IsMongoId()
  qualifyingStageId: string;

  @IsOptional()
  @IsMongoId()
  knockoutStageId: string;
}
