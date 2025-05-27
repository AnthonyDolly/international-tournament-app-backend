import {
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateKnockoutStageDto {
  @IsNotEmpty()
  @IsMongoId()
  tournamentId: string;

  @IsNotEmpty()
  @IsIn(['roundOf16', 'quarterFinal', 'semiFinal', 'final'])
  knockoutStage: string;

  @IsNotEmpty()
  @IsMongoId()
  firstTeamId: string;

  @IsNotEmpty()
  @IsMongoId()
  secondTeamId: string;

  @IsOptional()
  @IsBoolean()
  isSingleMatch?: boolean;
}
