import { IsMongoId, IsOptional, IsNotEmpty } from 'class-validator';

export class QueryGroupDto {
  @IsMongoId({ message: 'tournamentId is not a valid ObjectId' })
  @IsNotEmpty({ message: 'tournamentId is required' })
  tournamentId: string;

  @IsOptional()
  @IsMongoId({ message: 'groupId is not a valid ObjectId' })
  groupId?: string;
}
