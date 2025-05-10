import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { GroupClassificationService } from './group-classification.service';
import { CreateGroupClassificationsDto } from './dto/create-group-classification.dto';
import { QueryGroupDto } from './dto/query-group.dto';

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
}
