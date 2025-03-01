import { Module } from '@nestjs/common';
import { BombosService } from './bombos.service';
import { BombosController } from './bombos.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Bombo, BomboSchema } from './entities/bombo.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Bombo.name,
        schema: BomboSchema,
      },
    ]),
  ],
  controllers: [BombosController],
  providers: [BombosService],
})
export class BombosModule {}
