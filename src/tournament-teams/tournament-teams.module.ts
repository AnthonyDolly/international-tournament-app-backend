import { Module } from '@nestjs/common';
import { TournamentTeamsService } from './tournament-teams.service';
import { TournamentTeamsController } from './tournament-teams.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TournamentTeam,
  TournamentTeamSchema,
} from './entities/tournament-team.entity';
import { TournamentsModule } from 'src/tournaments/tournaments.module';
import { TeamsModule } from 'src/teams/teams.module';

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
  providers: [TournamentTeamsService],
  exports: [TournamentTeamsService],
})
export class TournamentTeamsModule {}
