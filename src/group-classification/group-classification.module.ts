import { Module } from '@nestjs/common';
import { GroupClassificationService } from './group-classification.service';
import { GroupClassificationController } from './group-classification.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  GroupClassification,
  GroupClassificationSchema,
} from './entities/group-classification.entity';
import { TournamentTeamsModule } from 'src/tournament-teams/tournament-teams.module';
import { GroupsModule } from 'src/groups/groups.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: GroupClassification.name,
        schema: GroupClassificationSchema,
      },
    ]),
    TournamentTeamsModule,
    GroupsModule,
  ],
  controllers: [GroupClassificationController],
  providers: [GroupClassificationService],
  exports: [GroupClassificationService],
})
export class GroupClassificationModule {}
