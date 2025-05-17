import { PartialType } from '@nestjs/mapped-types';
import { CreateKnockoutStageDto } from './create-knockout-stage.dto';

export class UpdateKnockoutStageDto extends PartialType(CreateKnockoutStageDto) {}
