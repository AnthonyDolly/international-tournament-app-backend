import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Tournament } from 'src/tournaments/entities/tournament.entity';
import { TournamentTeam } from 'src/tournament-teams/entities/tournament-team.entity';
import { QualifyingStage } from 'src/qualifying-stages/entities/qualifying-stage.entity';
import { KnockoutStage } from 'src/knockout-stages/entities/knockout-stage.entity';

export type MatchDocument = HydratedDocument<Match>;

@Schema()
export class Match {
  @Prop({ type: Types.ObjectId, ref: Tournament.name })
  tournamentId: Tournament;

  @Prop({
    required: true,
    enum: ['qualifyingStage', 'groupStage', 'knockoutStage'],
  })
  stage: string;

  @Prop({
    required: false,
    enum: [1, 2, 3, 4, 5, 6],
    type: Number,
    default: null,
  })
  matchDay: number;

  @Prop({
    type: Types.ObjectId,
    ref: TournamentTeam.name,
    required: true,
  })
  homeTeamId: TournamentTeam;

  @Prop({
    type: Types.ObjectId,
    ref: TournamentTeam.name,
    required: true,
  })
  awayTeamId: TournamentTeam;

  @Prop({ required: false, default: null })
  homeGoals: number;

  @Prop({ required: false, default: null })
  awayGoals: number;

  @Prop({ required: true })
  matchDate: Date;

  @Prop({ required: true })
  stadium: string;

  @Prop({
    required: false,
    enum: ['firstLeg', 'secondLeg', 'singleMatch'],
    default: null,
  })
  matchType: string;

  @Prop({
    type: Types.ObjectId,
    ref: QualifyingStage.name,
    required: false,
    default: null,
  })
  qualifyingStageId: QualifyingStage;

  @Prop({
    type: Types.ObjectId,
    ref: KnockoutStage.name,
    required: false,
    default: null,
  })
  knockoutStageId: KnockoutStage;

  @Prop({
    required: false,
    enum: ['pending', 'finished', 'cancelled'],
    default: 'pending',
  })
  status: string;
}

export const MatchSchema = SchemaFactory.createForClass(Match);

// Índice único para partidos de la fase de grupos
MatchSchema.index(
  {
    tournamentId: 1,
    stage: 1,
    matchDay: 1,
    homeTeamId: 1,
    awayTeamId: 1,
  },
  {
    unique: true,
    partialFilterExpression: { stage: 'groupStage' },
  },
);

// Índice único para partidos de etapas con ida/vuelta o partido único
MatchSchema.index(
  {
    tournamentId: 1,
    stage: 1,
    homeTeamId: 1,
    awayTeamId: 1,
    matchType: 1,
  },
  {
    unique: true,
    partialFilterExpression: { matchType: { $exists: true } },
  },
);
