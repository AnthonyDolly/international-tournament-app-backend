import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import {
  SOUTH_AMERICAN_COUNTRIES,
  SouthAmericanCountry,
} from '../constants/team.constants';

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(SOUTH_AMERICAN_COUNTRIES, {
    message: 'country must be a valid South American country',
  })
  country: SouthAmericanCountry;
}
