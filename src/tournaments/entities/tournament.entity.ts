import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TournamentDocument = HydratedDocument<Tournament>;

@Schema()
export class Tournament {
  @Prop({
    required: true,
    unique: true,
    uppercase: true,
  })
  name: string;

  @Prop({
    required: true,
    unique: true,
  })
  year: number;
}

export const TournamentSchema = SchemaFactory.createForClass(Tournament);
