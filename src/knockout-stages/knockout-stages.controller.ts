import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { KnockoutStagesService } from './knockout-stages.service';
import { CreateKnockoutStageDto } from './dto/create-knockout-stage.dto';
import { UpdateKnockoutStageDto } from './dto/update-knockout-stage.dto';

@Controller('knockout-stages')
export class KnockoutStagesController {
  constructor(private readonly knockoutStagesService: KnockoutStagesService) {}

  @Post()
  create(@Body() createKnockoutStageDto: CreateKnockoutStageDto) {
    return this.knockoutStagesService.create(createKnockoutStageDto);
  }

  @Get()
  findAll() {
    return this.knockoutStagesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.knockoutStagesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateKnockoutStageDto: UpdateKnockoutStageDto) {
    return this.knockoutStagesService.update(+id, updateKnockoutStageDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.knockoutStagesService.remove(+id);
  }
}
