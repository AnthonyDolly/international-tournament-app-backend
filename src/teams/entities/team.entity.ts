import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Bombo } from 'src/bombos/entities/bombo.entity';

export type TeamDocument = HydratedDocument<Team>;

@Schema()
export class Team {
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
    enum: [
      'argentina',
      'brasil',
      'chile',
      'colombia',
      'ecuador',
      'paraguay',
      'perú',
      'uruguay',
      'venezuela',
      'bolivia',
    ],
    lowercase: true,
  })
  country: string;

  @Prop({
    type: Types.ObjectId,
    ref: Bombo.name,
    required: true,
  })
  bombo: Bombo;

  @Prop({
    required: false,
    default: false,
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
