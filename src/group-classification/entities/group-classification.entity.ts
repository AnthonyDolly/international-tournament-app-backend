import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Group } from 'src/groups/entities/group.entity';
import { TournamentTeam } from 'src/tournament-teams/entities/tournament-team.entity';

export type GroupClassificationDocument = HydratedDocument<GroupClassification>;

@Schema()
export class GroupClassification {
  @Prop({
    type: Types.ObjectId,
    ref: TournamentTeam.name,
    required: true,
  })
  tournamentTeamId: TournamentTeam;

  @Prop({
    type: Types.ObjectId,
    ref: Group.name,
    required: true,
  })
  groupId: Group;

  @Prop({ required: false, default: 0 })
  matchesPlayed: number;

  @Prop({ required: false, default: 0 })
  wins: number;

  @Prop({ required: false, default: 0 })
  draws: number;

  @Prop({ required: false, default: 0 })
  losses: number;

  @Prop({ required: false, default: 0 })
  goalsFor: number;

  @Prop({ required: false, default: 0 })
  goalsAgainst: number;

  @Prop({ required: false, default: 0 })
  goalDifference: number;

  @Prop({ required: false, default: 0 })
  points: number;
}

export const GroupClassificationSchema =
  SchemaFactory.createForClass(GroupClassification);

GroupClassificationSchema.index(
  { tournamentTeamId: 1, groupId: 1 },
  { unique: true },
);
