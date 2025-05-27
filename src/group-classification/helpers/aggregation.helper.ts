import { PipelineStage, Types } from 'mongoose';

export class AggregationHelper {
  private readonly DEFAULT_BASE_URL = 'http://localhost:3000/uploads/';

  getGroupClassificationPipeline(
    tournamentId: string,
    groupId?: string,
    baseUrl: string = this.DEFAULT_BASE_URL,
  ): PipelineStage[] {
    return [
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

      // Filter by tournamentId and optional groupId
      {
        $match: this.buildMatchFilter(tournamentId, groupId),
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
            $push: this.buildTeamProjection(baseUrl),
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
      // Sort by group name
      { $sort: { 'group.name': 1 } },
    ];
  }

  private buildMatchFilter(tournamentId: string, groupId?: string) {
    const filter: any = {
      'tournamentTeamInfo.tournamentId': new Types.ObjectId(tournamentId),
    };

    if (groupId) {
      filter['groupInfo._id'] = new Types.ObjectId(groupId);
    }

    return filter;
  }

  private buildTeamProjection(baseUrl: string) {
    return {
      tournamentTeamId: '$tournamentTeamInfo._id',
      id: '$teamInfo._id',
      name: '$teamInfo.name',
      logo: {
        $cond: {
          if: '$teamInfo.logo',
          then: {
            $concat: [baseUrl, '$teamInfo.logo'],
          },
          else: null,
        },
      },
      matchesPlayed: '$matchesPlayed',
      wins: '$wins',
      draws: '$draws',
      losses: '$losses',
      goalsFor: '$goalsFor',
      goalsAgainst: '$goalsAgainst',
      goalDifference: '$goalDifference',
      points: '$points',
    };
  }
}
