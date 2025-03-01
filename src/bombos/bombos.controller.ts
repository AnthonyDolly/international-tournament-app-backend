import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { BombosService } from './bombos.service';
import { CreateBomboDto } from './dto/create-bombo.dto';
import { ValidateMongoIdPipe } from 'src/common/pipes/validate-mongo-id.pipe';

@Controller('bombos')
export class BombosController {
  constructor(private readonly bombosService: BombosService) {}

  @Post()
  create(@Body() createBomboDto: CreateBomboDto) {
    return this.bombosService.create(createBomboDto);
  }

  @Get()
  findAll() {
    return this.bombosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ValidateMongoIdPipe) id: string) {
    return this.bombosService.findOne(id);
  }
}
