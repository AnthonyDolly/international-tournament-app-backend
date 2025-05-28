import { Transform } from 'class-transformer';
import { IsOptional, IsIn, IsBoolean, IsInt } from 'class-validator';
import { SOUTH_AMERICAN_COUNTRIES, BOMBOS } from '../constants/team.constants';

export class QueryTeamsDto {
  @IsOptional()
  @IsIn(SOUTH_AMERICAN_COUNTRIES, {
    message: 'country must be a valid South American country',
  })
  country?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt({ message: 'bombo must be an integer' })
  @IsIn(BOMBOS, {
    message: 'bombo must be one of the values: 1, 2, 3, or 4',
  })
  bombo?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'isCurrentChampion must be a boolean value' })
  isCurrentChampion?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'isFromQualifiers must be a boolean value' })
  isFromQualifiers?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'includeInactive must be a boolean value' })
  includeInactive?: boolean;

  @IsOptional()
  @IsIn(['name', 'country', 'bombo', 'isCurrentChampion'], {
    message: 'sortBy must be one of: name, country, bombo, isCurrentChampion',
  })
  sortBy?: 'name' | 'country' | 'bombo' | 'isCurrentChampion';

  @IsOptional()
  @IsIn(['asc', 'desc'], {
    message: 'sortOrder must be either asc or desc',
  })
  sortOrder?: 'asc' | 'desc';
}
