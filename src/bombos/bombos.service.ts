import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Bombo } from './entities/bombo.entity';
import { CreateBomboDto } from './dto/create-bombo.dto';

@Injectable()
export class BombosService {
  constructor(
    @InjectModel(Bombo.name) private readonly bomboModel: Model<Bombo>,
  ) {}

  async create(createBomboDto: CreateBomboDto) {
    try {
      return await this.bomboModel.create(createBomboDto);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findAll() {
    return await this.bomboModel.find();
  }

  async findOne(id: string) {
    const bombo = await this.bomboModel.findById(id);

    if (!bombo) {
      throw new BadRequestException(`Bombo with id ${id} not found`);
    }

    return bombo;
  }

  private handleExceptions(error: any) {
    if (error.code === 11000) {
      console.log(error);
      throw new BadRequestException(
        `Bombo already exists in the database ${JSON.stringify(
          error.keyValue,
        )}`,
      );
    }
    console.log(error);
    throw new InternalServerErrorException(`Check Server logs`);
  }
}
