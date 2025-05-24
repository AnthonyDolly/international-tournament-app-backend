import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateKnockoutStageDto } from './create-knockout-stage.dto';
import {
  IsBoolean,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  Min,
} from 'class-validator';

export class UpdateKnockoutStageDto extends PartialType(
  OmitType(CreateKnockoutStageDto, [
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

  @IsOptional()
  @IsBoolean()
  firstLegPlayed?: boolean;

  @IsOptional()
  @IsBoolean()
  secondLegPlayed?: boolean;

  @IsOptional()
  @IsBoolean()
  penaltiesPlayed?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  firstTeamPenaltyGoals?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  secondTeamPenaltyGoals?: number;
}
