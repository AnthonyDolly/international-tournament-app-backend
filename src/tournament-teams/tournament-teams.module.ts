import { Module } from '@nestjs/common';
import { TournamentTeamsService } from './tournament-teams.service';
import { TournamentTeamsController } from './tournament-teams.controller';
import { GroupStageDrawService } from './services/group-stage-draw.service';
import { QualifyingStageDrawService } from './services/qualifying-stage-draw.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TournamentTeam,
  TournamentTeamSchema,
} from './entities/tournament-team.entity';
import { TournamentsModule } from 'src/tournaments/tournaments.module';
import { TeamsModule } from 'src/teams/teams.module';
import { FileManagementService } from 'src/teams/services/file-management.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: TournamentTeam.name,
        schema: TournamentTeamSchema,
      },
    ]),
    TournamentsModule,
    TeamsModule,
  ],
  controllers: [TournamentTeamsController],
  providers: [
    FileManagementService,
    TournamentTeamsService,
    GroupStageDrawService,
    QualifyingStageDrawService,
  ],
  exports: [TournamentTeamsService],
})
export class TournamentTeamsModule {}
