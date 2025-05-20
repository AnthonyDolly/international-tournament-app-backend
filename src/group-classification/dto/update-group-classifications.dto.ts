import {
  IsNotEmpty,
  IsArray,
  IsMongoId,
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
  ValidateNested,
  Min,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GroupClassificationItemDto {
  @IsNotEmpty()
  @IsMongoId()
  tournamentTeamId: string;

  @IsInt()
  @Min(0)
  matchesPlayed: number;

  @IsInt()
  @Min(0)
  wins: number;

  @IsInt()
  @Min(0)
  draws: number;

  @IsInt()
  @Min(0)
  losses: number;

  @IsInt()
  @Min(0)
  goalsFor: number;

  @IsInt()
  @Min(0)
  goalsAgainst: number;

  @IsInt()
  @Min(0)
  points: number;
}

export class UpdateGroupClassificationsDto {
  @IsNotEmpty()
  @IsMongoId()
  groupId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupClassificationItemDto)
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @ArrayUnique((o: GroupClassificationItemDto) => o.tournamentTeamId)
  classifications: GroupClassificationItemDto[];
}
