import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { TournamentTeamsService } from './tournament-teams.service';
import { CreateTournamentTeamsDto } from './dto/create-tournament-team.dto';
import { ValidateMongoIdPipe } from 'src/common/pipes/validate-mongo-id.pipe';

@Controller('tournament-teams')
export class TournamentTeamsController {
  constructor(
    private readonly tournamentTeamsService: TournamentTeamsService,
  ) {}

  @Post()
  create(@Body() createTournamentTeamsDto: CreateTournamentTeamsDto) {
    return this.tournamentTeamsService.create(createTournamentTeamsDto);
  }

  @Get()
  findAll() {
    return this.tournamentTeamsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ValidateMongoIdPipe) id: string) {
    return this.tournamentTeamsService.findOne(id);
  }

  @Get('tournament/:id')
  findByTournament(@Param('id', ValidateMongoIdPipe) id: string) {
    return this.tournamentTeamsService.findByTournament(id);
  }

  @Get('qualifying-stage-draw/:id')
  qualifyingStageDraw(@Param('id', ValidateMongoIdPipe) id: string) {
    return this.tournamentTeamsService.qualifyingStageDraw(id);
  }

  @Get('group-stage-draw/:id')
  groupStageDraw(@Param('id', ValidateMongoIdPipe) id: string) {
    return this.tournamentTeamsService.groupStageDraw(id);
  }
}
