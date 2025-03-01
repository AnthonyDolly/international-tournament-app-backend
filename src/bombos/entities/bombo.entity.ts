import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BomboDocument = HydratedDocument<Bombo>;

@Schema()
export class Bombo {
  @Prop({
    required: true,
    unique: true,
  })
  name: string;
}

export const BomboSchema = SchemaFactory.createForClass(Bombo);
