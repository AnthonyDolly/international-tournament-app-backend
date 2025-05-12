import { PartialType } from '@nestjs/mapped-types';
import { CreateMatchDto } from './create-match.dto';
import { IsIn, IsOptional } from 'class-validator';

export class UpdateMatchDto extends PartialType(CreateMatchDto) {
  @IsOptional()
  @IsIn(['pending', 'finished', 'cancelled'], {
    message: 'status must be a valid status: pending, finished, cancelled',
  })
  status: string;
}
