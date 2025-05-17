import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateQualifyingStageDto } from './create-qualifying-stage.dto';
import { IsMongoId, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class UpdateQualifyingStageDto extends PartialType(
  OmitType(CreateQualifyingStageDto, [
    'tournamentId',
    'firstTeamId',
    'secondTeamId',
  ]),
) {
  @IsNotEmpty()
  @IsNumber()
  firstTeamAggregateGoals: number;

  @IsNotEmpty()
  @IsNumber()
  secondTeamAggregateGoals: number;

  @IsOptional()
  @IsMongoId()
  winnerTeamId: string;
}
