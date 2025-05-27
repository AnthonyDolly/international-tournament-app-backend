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

  @Prop({ required: false, default: false })
  isSingleMatch: boolean;

  @Prop({ required: false, default: null })
  firstTeamGoals: number;

  @Prop({ required: false, default: null })
  secondTeamGoals: number;

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

  // Match completion status
  @Prop({ required: false, default: false })
  isCompleted: boolean;

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

// Virtual to get the match type based on the knockout stage
KnockoutStageSchema.virtual('matchType').get(function () {
  return this.knockoutStage === 'final' ? 'singleMatch' : 'twoLegged';
});

// Virtual to determine if the knockout stage is finished
KnockoutStageSchema.virtual('isFinished').get(function () {
  if (this.isSingleMatch) {
    return this.isCompleted;
  } else {
    return this.firstLegPlayed && this.secondLegPlayed;
  }
});
