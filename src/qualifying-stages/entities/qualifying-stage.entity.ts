import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Tournament } from 'src/tournaments/entities/tournament.entity';
import { TournamentTeam } from 'src/tournament-teams/entities/tournament-team.entity';

export type QualifyingStageDocument = HydratedDocument<QualifyingStage>;

@Schema()
export class QualifyingStage {
  @Prop({
    type: Types.ObjectId,
    ref: Tournament.name,
    required: true,
  })
  tournamentId: Tournament;

  @Prop({
    required: true,
    enum: [1, 2, 3],
    type: Number,
  })
  qualifyingStage: number;

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

  @Prop({ required: false, default: false })
  firstLegPlayed: boolean;

  @Prop({ required: false, default: false })
  secondLegPlayed: boolean;

  @Prop({ required: false, default: false })
  penaltiesPlayed: boolean;

  @Prop({ required: false, default: null })
  firstTeamPenaltyGoals: number;

  @Prop({ required: false, default: null })
  secondTeamPenaltyGoals: number;

  @Prop({
    type: Types.ObjectId,
    ref: TournamentTeam.name,
    required: false,
    default: null,
  })
  winnerTeamId: TournamentTeam;

  @Prop({
    type: Types.ObjectId,
    ref: QualifyingStage.name,
    required: false,
    default: null,
  })
  nextQualifyingStageMatchId: QualifyingStage;
}

export const QualifyingStageSchema =
  SchemaFactory.createForClass(QualifyingStage);

QualifyingStageSchema.index(
  { tournamentId: 1, qualifyingStage: 1, firstTeamId: 1, secondTeamId: 1 },
  { unique: true },
);
