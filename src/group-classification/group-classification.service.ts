import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateGroupClassificationsDto } from './dto/create-group-classification.dto';
import { InjectModel } from '@nestjs/mongoose';
import { GroupClassification } from './entities/group-classification.entity';
import { Model, Types } from 'mongoose';
import { TournamentTeamsService } from 'src/tournament-teams/tournament-teams.service';
import { GroupsService } from 'src/groups/groups.service';

@Injectable()
export class GroupClassificationService {
  constructor(
    @InjectModel(GroupClassification.name)
    private readonly groupClassificationModel: Model<GroupClassification>,
    private readonly tournamentTeamService: TournamentTeamsService,
    private readonly groupService: GroupsService,
  ) {}

  async findByTournamentIdAndGroupId(tournamentId: string, groupId?: string) {
    const groups = await this.groupClassificationModel.aggregate([
      // Join with groups to get group name
      {
        $lookup: {
          from: 'groups',
          localField: 'groupId',
          foreignField: '_id',
          as: 'groupInfo',
        },
      },
      { $unwind: '$groupInfo' },

      // Join with tournamentteams to get tournamentId and teamId
      {
        $lookup: {
          from: 'tournamentteams',
          localField: 'tournamentTeamId',
          foreignField: '_id',
          as: 'tournamentTeamInfo',
        },
      },
      { $unwind: '$tournamentTeamInfo' },

      // Filter by tournamentId
      {
        $match: {
          'tournamentTeamInfo.tournamentId': new Types.ObjectId(tournamentId),
          ...(groupId && { 'groupInfo._id': new Types.ObjectId(groupId) }),
        },
      },

      // Join with teams to get team details
      {
        $lookup: {
          from: 'teams',
          localField: 'tournamentTeamInfo.teamId',
          foreignField: '_id',
          as: 'teamInfo',
        },
      },
      { $unwind: '$teamInfo' },

      // Group by group name
      {
        $group: {
          _id: {
            id: '$groupInfo._id',
            name: '$groupInfo.name',
          },
          teams: {
            $push: {
              tournamentTeamId: '$tournamentTeamInfo._id',
              id: '$teamInfo._id',
              name: '$teamInfo.name',
              logo: '$teamInfo.logo',
              matchesPlayed: '$matchesPlayed',
              wins: '$wins',
              draws: '$draws',
              losses: '$losses',
              goalsFor: '$goalsFor',
              goalsAgainst: '$goalsAgainst',
              goalDifference: '$goalDifference',
              points: '$points',
            },
          },
        },
      },

      // Format output
      {
        $project: {
          _id: 0,
          group: {
            id: '$_id.id',
            name: '$_id.name',
          },
          teams: 1,
        },
      },
      // Optional: sort by group name (A, B, ...)
      { $sort: { 'group.name': 1 } },
    ]);

    const reorderedGroups = groups.map((group) => ({
      group: group.group,
      teams: group.teams.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference)
          return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
      }),
    }));

    if (reorderedGroups.length === 0) {
      throw new NotFoundException('Group classification not found');
    }

    return { groups: reorderedGroups };
  }

  async create(createGroupClassificationDto: CreateGroupClassificationsDto) {
    try {
      const { groupId, tournamentTeamIds } = createGroupClassificationDto;

      const tournamentTeams =
        await this.tournamentTeamService.findByIds(tournamentTeamIds);

      if (tournamentTeams.length !== tournamentTeamIds.length) {
        throw new BadRequestException(
          'One or more tournamentteams do not exist in the database',
        );
      }

      const group = await this.groupService.findOne(groupId);

      const existingGroupClassifications =
        await this.groupClassificationModel.find({
          tournamentTeamId: {
            $in: tournamentTeams.map((tournamentTeam) => tournamentTeam._id),
          },
          groupId: group._id,
        });

      if (existingGroupClassifications.length > 0) {
        throw new BadRequestException(
          'One or more tournamentteams already exist in the group',
        );
      }

      const groupClassifications = tournamentTeams.map((tournamentTeam) => ({
        tournamentTeamId: tournamentTeam._id,
        groupId: group._id,
      }));

      return await this.groupClassificationModel.insertMany(
        groupClassifications,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.handleExceptions(error);
    }
  }

  private handleExceptions(error: any) {
    if (error.code === 11000) {
      console.log(error);
      const keyValueString = Object.entries(error.keyValue)
        .map(([key, value]) => `${key}: '${value}'`)
        .join(', ');

      throw new BadRequestException(
        `Group classification already exists in the database { ${keyValueString} }`,
      );
    }
    console.log(error);
    throw new InternalServerErrorException(`Check Server logs`);
  }
}
