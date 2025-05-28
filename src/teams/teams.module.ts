import { Module } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Team, TeamSchema } from './entities/team.entity';
import { FileManagementService } from './services/file-management.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Team.name,
        schema: TeamSchema,
      },
    ]),
  ],
  controllers: [TeamsController],
  providers: [TeamsService, FileManagementService],
  exports: [TeamsService],
})
export class TeamsModule {}
