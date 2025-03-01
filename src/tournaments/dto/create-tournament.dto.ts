import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateTournamentDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsInt()
  @IsNotEmpty()
  @Min(2025)
  year: number;
}
