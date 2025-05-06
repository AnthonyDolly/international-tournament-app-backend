import { Type } from 'class-transformer';
import { IsArray, IsMongoId, ValidateNested } from 'class-validator';

export class CreateTournamentTeamDto {
  @IsMongoId({ message: 'team must be a valid MongoDB ObjectId' })
  teamId: string;
}

export class CreateTournamentTeamsDto {
  @IsMongoId({ message: 'tournament must be a valid MongoDB ObjectId' })
  tournamentId: string;

  @IsArray()
  @ValidateNested({ each: true }) // 🔥 Valida cada elemento del array
  @Type(() => CreateTournamentTeamDto) // 🔥 Convierte cada elemento al DTO especificado
  teams: CreateTournamentTeamDto[];
}
