import { Module } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Team, TeamSchema } from './entities/team.entity';
import { BombosModule } from 'src/bombos/bombos.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Team.name,
        schema: TeamSchema,
      },
    ]),
    BombosModule,
  ],
  controllers: [TeamsController],
  providers: [TeamsService],
})
export class TeamsModule {}
