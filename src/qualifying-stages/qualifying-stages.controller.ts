import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { QualifyingStagesService } from './qualifying-stages.service';
import { CreateQualifyingStageDto } from './dto/create-qualifying-stage.dto';
import { UpdateQualifyingStageDto } from './dto/update-qualifying-stage.dto';
import { ValidateMongoIdPipe } from 'src/common/pipes/validate-mongo-id.pipe';

@Controller('qualifying-stages')
export class QualifyingStagesController {
  constructor(
    private readonly qualifyingStagesService: QualifyingStagesService,
  ) {}

  @Post()
  create(@Body() createQualifyingStageDto: CreateQualifyingStageDto) {
    return this.qualifyingStagesService.create(createQualifyingStageDto);
  }

  @Get('tournament/:tournamentId')
  findAllByTournament(
    @Param('tournamentId', ValidateMongoIdPipe) tournamentId: string,
  ) {
    return this.qualifyingStagesService.findAllByTournament(tournamentId);
  }

  @Get(':id')
  findOne(@Param('id', ValidateMongoIdPipe) id: string) {
    return this.qualifyingStagesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ValidateMongoIdPipe) id: string,
    @Body() updateQualifyingStageDto: UpdateQualifyingStageDto,
  ) {
    return this.qualifyingStagesService.update(id, updateQualifyingStageDto);
  }
}
