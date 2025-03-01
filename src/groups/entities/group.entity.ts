import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GroupDocument = HydratedDocument<Group>;

@Schema()
export class Group {
  @Prop({
    required: true,
    unique: true,
  })
  name: string;
}

export const GroupSchema = SchemaFactory.createForClass(Group);
