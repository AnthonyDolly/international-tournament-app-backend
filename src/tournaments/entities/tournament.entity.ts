import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TournamentDocument = HydratedDocument<Tournament>;

@Schema()
export class Tournament {
  @Prop({
    required: true,
    uppercase: true,
  })
  name: string;

  @Prop({
    required: true,
  })
  year: number;
}

export const TournamentSchema = SchemaFactory.createForClass(Tournament);

TournamentSchema.index({ name: 1, year: 1 }, { unique: true });
