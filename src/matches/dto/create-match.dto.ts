import {
  IsDate,
  IsIn,
  IsInt,
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
  @IsIn(
    [
      'preliminary',
      'groupStage',
      'roundOf16',
      'quarterFinals',
      'semiFinals',
      'final',
    ],
    { message: 'stage must be a valid stage' },
  )
  stage: string;

  @IsOptional()
  @IsIn([1, 2, 3, 4, 5, 6], {
    message: 'matchDay must be a valid matchday',
  })
  matchDay: number;

  @IsNotEmpty()
  @IsMongoId()
  homeTeamId: string;

  @IsNotEmpty()
  @IsMongoId()
  awayTeamId: string;

  @IsOptional()
  @IsInt()
  homeGoals: number;

  @IsOptional()
  @IsInt()
  awayGoals: number;

  @IsNotEmpty()
  @IsDate()
  matchDate: Date;

  @IsNotEmpty()
  @IsString()
  stadium: string;

  @IsOptional()
  @IsIn(['firstLeg', 'secondLeg', 'singleMatch'], {
    message: 'matchType must be a valid match type',
  })
  matchType: string;
}
