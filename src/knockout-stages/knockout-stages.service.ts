import { Injectable } from '@nestjs/common';
import { CreateKnockoutStageDto } from './dto/create-knockout-stage.dto';
import { UpdateKnockoutStageDto } from './dto/update-knockout-stage.dto';

@Injectable()
export class KnockoutStagesService {
  create(createKnockoutStageDto: CreateKnockoutStageDto) {
    return 'This action adds a new knockoutStage';
  }

  findAll() {
    return `This action returns all knockoutStages`;
  }

  findOne(id: number) {
    return `This action returns a #${id} knockoutStage`;
  }

  update(id: number, updateKnockoutStageDto: UpdateKnockoutStageDto) {
    return `This action updates a #${id} knockoutStage`;
  }

  remove(id: number) {
    return `This action removes a #${id} knockoutStage`;
  }
}
