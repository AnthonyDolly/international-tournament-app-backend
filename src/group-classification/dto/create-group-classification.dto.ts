import { IsArray, IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateGroupClassificationsDto {
  @IsMongoId()
  @IsNotEmpty()
  groupId: string;

  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty({ each: true })
  tournamentTeamIds: string[];
}
