import { Module } from '@nestjs/common';
import { BombosModule } from './bombos/bombos.module';
import { MongooseModule } from '@nestjs/mongoose';
import { envs } from './config/envs';
import { GroupsModule } from './groups/groups.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { TeamsModule } from './teams/teams.module';

@Module({
  imports: [
    MongooseModule.forRoot(envs.mongodbUri),
    BombosModule,
    GroupsModule,
    TournamentsModule,
    TeamsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
