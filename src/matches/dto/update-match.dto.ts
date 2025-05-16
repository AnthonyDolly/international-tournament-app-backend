import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateMatchDto } from './create-match.dto';
import { IsIn, IsInt, IsNotEmpty, Min } from 'class-validator';

export class UpdateMatchDto extends PartialType(
  OmitType(CreateMatchDto, [
    'groupId',
    'tournamentId',
    'homeTeamId',
    'awayTeamId',
  ]),
) {
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  homeGoals: number;

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  awayGoals: number;

  @IsNotEmpty()
  @IsIn(['pending', 'finished', 'cancelled'])
  status: string;
}
