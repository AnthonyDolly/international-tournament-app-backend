import { Module } from '@nestjs/common';
import { BombosModule } from './bombos/bombos.module';
import { MongooseModule } from '@nestjs/mongoose';
import { envs } from './config/envs';

@Module({
  imports: [MongooseModule.forRoot(envs.mongodbUri), BombosModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
