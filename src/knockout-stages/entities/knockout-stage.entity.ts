import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Tournament } from 'src/tournaments/entities/tournament.entity';
import { TournamentTeam } from 'src/tournament-teams/entities/tournament-team.entity';

export type KnockoutStageDocument = HydratedDocument<KnockoutStage>;

@Schema()
export class KnockoutStage {
  @Prop({
    type: Types.ObjectId,
    ref: Tournament.name,
    required: true,
  })
  tournamentId: Tournament;

  @Prop({
    required: true,
    enum: ['roundOf16', 'quarterFinal', 'semiFinal', 'final'],
    type: String,
  })
  knockoutStage: string;

  @Prop({
    type: Types.ObjectId,
    ref: TournamentTeam.name,
    required: true,
  })
  firstTeamId: TournamentTeam;

  @Prop({
    type: Types.ObjectId,
    ref: TournamentTeam.name,
    required: true,
  })
  secondTeamId: TournamentTeam;

  @Prop({ required: false, default: null })
  firstTeamAggregateGoals: number;

  @Prop({ required: false, default: null })
  secondTeamAggregateGoals: number;

  @Prop({
    type: Types.ObjectId,
    ref: TournamentTeam.name,
    required: false,
    default: null,
  })
  winnerTeamId: TournamentTeam;
}

export const KnockoutStageSchema = SchemaFactory.createForClass(KnockoutStage);

KnockoutStageSchema.index(
  { tournamentId: 1, knockoutStage: 1, firstTeamId: 1, secondTeamId: 1 },
  { unique: true },
);
