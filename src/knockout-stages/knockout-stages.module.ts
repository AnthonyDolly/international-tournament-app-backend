import { Module } from '@nestjs/common';
import { KnockoutStagesService } from './knockout-stages.service';
import { KnockoutStagesController } from './knockout-stages.controller';

@Module({
  controllers: [KnockoutStagesController],
  providers: [KnockoutStagesService],
})
export class KnockoutStagesModule {}
