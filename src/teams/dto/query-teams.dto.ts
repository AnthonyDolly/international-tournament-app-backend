import { IsOptional, IsIn } from 'class-validator';
import {
  SOUTH_AMERICAN_COUNTRIES,
  SouthAmericanCountry,
} from '../constants/team.constants';

export class QueryTeamsDto {
  @IsOptional()
  @IsIn(SOUTH_AMERICAN_COUNTRIES, {
    message: 'country must be a valid South American country',
  })
  country?: SouthAmericanCountry;

  @IsOptional()
  @IsIn(['name', 'country'], {
    message: 'sortBy must be one of: name, country',
  })
  sortBy?: 'name' | 'country';

  @IsOptional()
  @IsIn(['asc', 'desc'], {
    message: 'sortOrder must be either asc or desc',
  })
  sortOrder?: 'asc' | 'desc';
}
