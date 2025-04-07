import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTeamDto {
  @IsString()
  name: string;

  @IsIn(
    [
      'argentina',
      'brasil',
      'chile',
      'colombia',
      'ecuador',
      'paraguay',
      'perú',
      'uruguay',
      'venezuela',
      'bolivia',
    ],
    { message: 'country must be a valid South American country' },
  )
  country: string;

  @IsIn([1, 2, 3, 4], {
    message: 'bombo must be one of the values: 1, 2, 3, or 4',
  })
  @IsNotEmpty()
  bombo: number;

  @IsBoolean({
    message: 'isParticipating must be a boolean value',
  })
  @IsOptional()
  isParticipating: boolean;

  @IsBoolean({
    message: 'isCurrentChampion must be a boolean value',
  })
  @IsOptional()
  isCurrentChampion: boolean;

  @IsBoolean({
    message: 'isFromQualifiers must be a boolean value',
  })
  @IsOptional()
  isFromQualifiers: boolean;
}
