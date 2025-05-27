import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { GroupClassificationService } from './group-classification.service';
import { CreateGroupClassificationsDto } from './dto/create-group-classification.dto';
import { QueryGroupDto } from './dto/query-group.dto';
import { DrawKnockoutDto } from './dto/draw-knockout.dto';

@Controller('group-classification')
export class GroupClassificationController {
  constructor(
    private readonly groupClassificationService: GroupClassificationService,
  ) {}

  @Get()
  findByTournamentIdAndGroupId(@Query() query: QueryGroupDto) {
    const { tournamentId, groupId } = query;

    return this.groupClassificationService.findByTournamentIdAndGroupId(
      tournamentId,
      groupId,
    );
  }

  @Post()
  create(@Body() createGroupClassificationDto: CreateGroupClassificationsDto) {
    return this.groupClassificationService.create(createGroupClassificationDto);
  }

  @Post('draw-knockout')
  drawKnockout(@Body() drawKnockoutDto: DrawKnockoutDto) {
    return this.groupClassificationService.drawKnockoutMatchups(
      drawKnockoutDto.tournamentId,
    );
  }

  @Get('qualified-teams/:tournamentId')
  getQualifiedTeams(@Param('tournamentId') tournamentId: string) {
    return this.groupClassificationService.getQualifiedTeams(tournamentId);
  }
}
