import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateQualifyingStageDto } from './create-qualifying-stage.dto';
import { IsInt, IsMongoId, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class UpdateQualifyingStageDto extends PartialType(
  OmitType(CreateQualifyingStageDto, [
    'tournamentId',
    'firstTeamId',
    'secondTeamId',
  ]),
) {
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  firstTeamAggregateGoals: number;

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  secondTeamAggregateGoals: number;

  @IsOptional()
  @IsMongoId()
  winnerTeamId: string;
}
