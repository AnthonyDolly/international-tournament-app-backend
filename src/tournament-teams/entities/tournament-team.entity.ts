import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Team } from 'src/teams/entities/team.entity';
import { Tournament } from 'src/tournaments/entities/tournament.entity';

export type TournamentTeamDocument = HydratedDocument<TournamentTeam>;

@Schema()
export class TournamentTeam {
  @Prop({
    type: Types.ObjectId,
    ref: Tournament.name,
    required: true,
  })
  tournament: Tournament;

  @Prop({
    type: Types.ObjectId,
    ref: Team.name,
    required: true,
  })
  team: Team;
}

export const TournamentTeamSchema =
  SchemaFactory.createForClass(TournamentTeam);

TournamentTeamSchema.index({ tournament: 1, team: 1 }, { unique: true });
