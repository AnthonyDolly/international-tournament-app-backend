import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { envs } from './config/envs';
import { GroupsModule } from './groups/groups.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { TeamsModule } from './teams/teams.module';
import { TournamentTeamsModule } from './tournament-teams/tournament-teams.module';
import { GroupClassificationModule } from './group-classification/group-classification.module';
import { MatchesModule } from './matches/matches.module';

@Module({
  imports: [
    MongooseModule.forRoot(envs.mongodbUri),
    GroupsModule,
    TournamentsModule,
    TeamsModule,
    TournamentTeamsModule,
    GroupClassificationModule,
    MatchesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
