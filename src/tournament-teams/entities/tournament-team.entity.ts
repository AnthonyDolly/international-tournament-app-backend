import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Team } from 'src/teams/entities/team.entity';
import { Tournament } from 'src/tournaments/entities/tournament.entity';
import {
  BOMBOS,
  BomboType,
  QUALIFYING_ENTRY_STAGES,
  QualifyingEntryStage,
} from '../constants/tournament.constants';

export type TournamentTeamDocument = HydratedDocument<TournamentTeam>;

@Schema()
export class TournamentTeam {
  @Prop({
    type: Types.ObjectId,
    ref: Tournament.name,
    required: true,
  })
  tournamentId: Tournament;

  @Prop({
    type: Types.ObjectId,
    ref: Team.name,
    required: true,
  })
  teamId: Team;

  @Prop({
    type: Number,
    required: false,
    default: null,
  })
  ranking: number;

  @Prop({
    type: Number,
    required: true,
  })
  points: number;

  @Prop({
    enum: BOMBOS,
    required: true,
  })
  bombo: BomboType;

  @Prop({
    type: Boolean,
    required: false,
    default: true,
  })
  isParticipating: boolean;

  @Prop({
    type: Boolean,
    required: false,
    default: false,
  })
  isCurrentChampion: boolean;

  @Prop({
    type: Boolean,
    required: false,
    default: false,
  })
  isFromQualifyingStage: boolean;

  @Prop({
    enum: QUALIFYING_ENTRY_STAGES,
    required: false,
    default: null,
  })
  qualifyingEntryStage: QualifyingEntryStage;
}

export const TournamentTeamSchema =
  SchemaFactory.createForClass(TournamentTeam);

TournamentTeamSchema.index({ tournamentId: 1, teamId: 1 }, { unique: true });
TournamentTeamSchema.index({ isParticipating: 1 });
TournamentTeamSchema.index({ bombo: 1 });
TournamentTeamSchema.index(
  { tournamentId: 1, ranking: 1 },
  {
    unique: true,
    partialFilterExpression: { ranking: { $type: 'number' } },
  },
);
