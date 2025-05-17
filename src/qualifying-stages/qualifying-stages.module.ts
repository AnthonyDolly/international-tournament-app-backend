import { Module } from '@nestjs/common';
import { QualifyingStagesService } from './qualifying-stages.service';
import { QualifyingStagesController } from './qualifying-stages.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  QualifyingStage,
  QualifyingStageSchema,
} from './entities/qualifying-stage.entity';
import { TournamentsModule } from 'src/tournaments/tournaments.module';
import { TournamentTeamsModule } from 'src/tournament-teams/tournament-teams.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: QualifyingStage.name,
        schema: QualifyingStageSchema,
      },
    ]),
    TournamentsModule,
    TournamentTeamsModule,
  ],
  controllers: [QualifyingStagesController],
  providers: [QualifyingStagesService],
  exports: [QualifyingStagesService],
})
export class QualifyingStagesModule {}
