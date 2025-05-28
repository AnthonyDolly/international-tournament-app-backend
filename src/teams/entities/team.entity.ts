import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SOUTH_AMERICAN_COUNTRIES, BOMBOS } from '../constants/team.constants';

export type TeamDocument = HydratedDocument<Team>;

@Schema({ timestamps: true })
export class Team {
  _id: Types.ObjectId;

  @Prop({
    required: true,
    lowercase: true,
  })
  name: string;

  @Prop({
    required: false,
  })
  logo: string;

  @Prop({
    required: true,
    enum: SOUTH_AMERICAN_COUNTRIES,
    lowercase: true,
  })
  country: string;

  @Prop({
    required: true,
    enum: BOMBOS,
    type: Number,
  })
  bombo: number;

  @Prop({
    required: false,
    default: true,
  })
  isParticipating: boolean;

  @Prop({
    required: false,
    default: false,
  })
  isCurrentChampion: boolean;

  @Prop({
    required: false,
    default: false,
  })
  isFromQualifiers: boolean;
}

export const TeamSchema = SchemaFactory.createForClass(Team);

TeamSchema.index({ name: 1, country: 1 }, { unique: true });
TeamSchema.index({ isParticipating: 1 });
TeamSchema.index({ bombo: 1 });
TeamSchema.index({ country: 1 });
