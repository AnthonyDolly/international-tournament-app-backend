import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { GroupClassificationService } from './group-classification.service';
import {
  CreateGroupClassificationsDto,
  QueryGroupDto,
  DrawKnockoutDto,
} from './dto';

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

  @Post('draw-complete-bracket')
  drawCompleteBracket(@Body() drawKnockoutDto: DrawKnockoutDto) {
    return this.groupClassificationService.drawCompleteTournamentBracket(
      drawKnockoutDto.tournamentId,
    );
  }

  @Get('qualified-teams/:tournamentId')
  getQualifiedTeams(@Param('tournamentId') tournamentId: string) {
    return this.groupClassificationService.getQualifiedTeams(tournamentId);
  }
}
