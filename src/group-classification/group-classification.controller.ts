import { Controller, Get, Post, Body, Query, Patch } from '@nestjs/common';
import { GroupClassificationService } from './group-classification.service';
import { CreateGroupClassificationsDto } from './dto/create-group-classification.dto';
import { QueryGroupDto } from './dto/query-group.dto';
import { UpdateGroupClassificationsDto } from './dto/update-group-classifications.dto';

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

  @Patch()
  update(@Body() updateGroupClassificationDto: UpdateGroupClassificationsDto) {
    return this.groupClassificationService.update(updateGroupClassificationDto);
  }
}
