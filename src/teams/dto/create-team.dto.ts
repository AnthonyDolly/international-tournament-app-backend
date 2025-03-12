import {
  IsBoolean,
  IsIn,
  IsMongoId,
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

  @IsMongoId({ message: 'bombo must be a valid MongoDB ObjectId' })
  bombo: string;

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
