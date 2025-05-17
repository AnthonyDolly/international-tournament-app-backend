import { IsIn, IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateQualifyingStageDto {
  @IsNotEmpty()
  @IsMongoId()
  tournamentId: string;

  @IsNotEmpty()
  @IsIn([1, 2, 3])
  qualifyingStage: number;

  @IsNotEmpty()
  @IsMongoId()
  firstTeamId: string;

  @IsNotEmpty()
  @IsMongoId()
  secondTeamId: string;
}
