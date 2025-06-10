import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { GroupClassificationService } from './group-classification.service';
import { CreateGroupClassificationsDto, QueryGroupDto } from './dto';

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

  @Get('draw-complete-bracket/:tournamentId')
  drawCompleteBracket(@Param('tournamentId') tournamentId: string) {
    return this.groupClassificationService.drawCompleteTournamentBracket(
      tournamentId,
    );
  }

  @Get('qualified-teams/:tournamentId')
  getQualifiedTeams(@Param('tournamentId') tournamentId: string) {
    return this.groupClassificationService.getQualifiedTeams(tournamentId);
  }
}
