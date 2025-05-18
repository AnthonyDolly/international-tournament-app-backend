import { Module } from '@nestjs/common';
import { KnockoutStagesService } from './knockout-stages.service';
import { KnockoutStagesController } from './knockout-stages.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  KnockoutStage,
  KnockoutStageSchema,
} from './entities/knockout-stage.entity';
import { TournamentsModule } from 'src/tournaments/tournaments.module';
import { TournamentTeamsModule } from 'src/tournament-teams/tournament-teams.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: KnockoutStage.name,
        schema: KnockoutStageSchema,
      },
    ]),
    TournamentsModule,
    TournamentTeamsModule,
  ],
  controllers: [KnockoutStagesController],
  providers: [KnockoutStagesService],
  exports: [KnockoutStagesService],
})
export class KnockoutStagesModule {}
