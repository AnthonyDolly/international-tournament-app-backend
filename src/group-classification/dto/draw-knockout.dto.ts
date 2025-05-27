import { IsNotEmpty, IsMongoId } from 'class-validator';

export class DrawKnockoutDto {
  @IsMongoId()
  @IsNotEmpty()
  tournamentId: string;
}
