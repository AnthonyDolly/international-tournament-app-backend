import { Module } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { MatchesController } from './matches.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Match, MatchSchema } from './entities/match.entity';
import { TournamentsModule } from 'src/tournaments/tournaments.module';
import { TournamentTeamsModule } from 'src/tournament-teams/tournament-teams.module';
import { GroupClassificationModule } from 'src/group-classification/group-classification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Match.name,
        schema: MatchSchema,
      },
    ]),
    TournamentsModule,
    TournamentTeamsModule,
    GroupClassificationModule,
  ],
  controllers: [MatchesController],
  providers: [MatchesService],
})
export class MatchesModule {}
