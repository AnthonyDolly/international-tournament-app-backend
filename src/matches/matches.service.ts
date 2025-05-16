import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Match } from './entities/match.entity';
import { Model, Types } from 'mongoose';
import { TournamentsService } from 'src/tournaments/tournaments.service';
import { TournamentTeamsService } from 'src/tournament-teams/tournament-teams.service';
import { GroupClassificationService } from 'src/group-classification/group-classification.service';

@Injectable()
export class MatchesService {
  constructor(
    @InjectModel(Match.name) private readonly matchModel: Model<Match>,
    private readonly tournamentService: TournamentsService,
    private readonly tournamentTeamService: TournamentTeamsService,
    private readonly groupClassificationService: GroupClassificationService,
  ) {}

  async create(createMatchDto: CreateMatchDto) {
    try {
      const { groupId, ...matchData } = createMatchDto;

      // Validate matchDay for group stage
      if (matchData.stage === 'groupStage' && !matchData.matchDay) {
        throw new BadRequestException(
          'matchDay is required for group stage matches, put a number between 1 and 6',
        );
      }

      // Fetch all required data in parallel
      const [groupClassification, tournament, homeTeam, awayTeam] =
        await Promise.all([
          this.groupClassificationService.findByTournamentIdAndGroupId(
            matchData.tournamentId,
            groupId,
          ),
          this.tournamentService.findOne(matchData.tournamentId),
          this.tournamentTeamService.findOne(matchData.homeTeamId),
          this.tournamentTeamService.findOne(matchData.awayTeamId),
        ]);

      // Validate group classification
      if (groupClassification.groups.length === 0) {
        throw new BadRequestException('Group classification not found');
      }

      // Validate tournament and teams exist
      if (!tournament || !homeTeam || !awayTeam) {
        throw new BadRequestException(
          'tournament, homeTeam or awayTeam not found',
        );
      }

      const tournamentId = tournament._id.toString();

      // Validate teams belong to tournament
      if (
        homeTeam.tournamentId._id.toString() !== tournamentId ||
        awayTeam.tournamentId._id.toString() !== tournamentId
      ) {
        throw new BadRequestException('teams must belong to the tournament');
      }

      // Validate teams are different
      if (homeTeam.teamId._id.toString() === awayTeam.teamId._id.toString()) {
        throw new BadRequestException(
          'homeTeam and awayTeam are the same team',
        );
      }

      // Validate teams belong to the group
      const teamsInGroup = groupClassification.groups[0].teams;
      const homeTeamInGroup = teamsInGroup.some(
        (team) =>
          team.tournamentTeamId.toString() === matchData.homeTeamId.toString(),
      );
      const awayTeamInGroup = teamsInGroup.some(
        (team) =>
          team.tournamentTeamId.toString() === matchData.awayTeamId.toString(),
      );

      if (!homeTeamInGroup || !awayTeamInGroup) {
        throw new BadRequestException(
          'homeTeamId or awayTeamId is not in the group',
        );
      }

      // Create match with validated data
      return await this.matchModel.create({
        ...matchData,
        tournamentId: tournament._id,
        homeTeamId: homeTeam._id,
        awayTeamId: awayTeam._id,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.handleExceptions(error);
    }
  }

  async findAll() {
    return await this.matchModel
      .find()
      .populate({
        path: 'tournamentId',
        select: 'name year',
      })
      .populate({
        path: 'homeTeamId',
        select: 'teamId',
        populate: {
          path: 'teamId',
          select: '-_id name logo',
        },
      })
      .populate({
        path: 'awayTeamId',
        select: 'teamId',
        populate: {
          path: 'teamId',
          select: '-_id name logo',
        },
      });
  }

  async findOne(id: string) {
    const objectId = new this.matchModel.base.Types.ObjectId(id);

    const result = await this.matchModel.aggregate([
      { $match: { _id: objectId } },
      {
        $lookup: {
          from: 'tournaments',
          localField: 'tournamentId',
          foreignField: '_id',
          as: 'tournament',
        },
      },
      { $unwind: '$tournament' },
      {
        $lookup: {
          from: 'tournamentteams',
          localField: 'homeTeamId',
          foreignField: '_id',
          as: 'homeTeam',
        },
      },
      { $unwind: '$homeTeam' },
      {
        $lookup: {
          from: 'tournamentteams',
          localField: 'awayTeamId',
          foreignField: '_id',
          as: 'awayTeam',
        },
      },
      { $unwind: '$awayTeam' },
      {
        $lookup: {
          from: 'groupclassifications',
          localField: 'homeTeam._id',
          foreignField: 'tournamentTeamId',
          as: 'groupInfo',
        },
      },
      { $unwind: { path: '$groupInfo', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'groups',
          localField: 'groupInfo.groupId',
          foreignField: '_id',
          as: 'group',
        },
      },
      { $unwind: { path: '$group', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          group: '$group.name',
        },
      },
      {
        $lookup: {
          from: 'teams',
          localField: 'homeTeam.teamId',
          foreignField: '_id',
          as: 'homeTeamInfo',
        },
      },
      { $unwind: '$homeTeamInfo' },
      {
        $lookup: {
          from: 'teams',
          localField: 'awayTeam.teamId',
          foreignField: '_id',
          as: 'awayTeamInfo',
        },
      },
      { $unwind: '$awayTeamInfo' },
      {
        $project: {
          _id: 1,
          tournament: {
            name: '$tournament.name',
            year: '$tournament.year',
            _id: '$tournament._id',
          },
          matchDate: 1,
          homeTeam: {
            _id: '$homeTeam._id',
            team: {
              name: '$homeTeamInfo.name',
              logo: '$homeTeamInfo.logo',
              _id: '$homeTeamInfo._id',
            },
          },
          awayTeam: {
            _id: '$awayTeam._id',
            team: {
              name: '$awayTeamInfo.name',
              logo: '$awayTeamInfo.logo',
              _id: '$awayTeamInfo._id',
            },
          },
          homeGoals: 1,
          awayGoals: 1,
          stage: 1,
          group: 1,
          matchDay: 1,
          matchType: 1,
          stadium: 1,
          status: 1,
        },
      },
    ]);

    if (!result.length) throw new BadRequestException('Match not found');
    const raw = result[0];
    return {
      _id: raw._id,
      tournament: raw.tournament,
      matchDate: raw.matchDate,
      homeTeam: raw.homeTeam,
      awayTeam: raw.awayTeam,
      homeGoals: raw.homeGoals,
      awayGoals: raw.awayGoals,
      stage: raw.stage,
      group: raw.group,
      matchDay: raw.matchDay,
      matchType: raw.matchType,
      stadium: raw.stadium,
      status: raw.status,
    };
  }

  async update(id: string, updateMatchDto: UpdateMatchDto) {
    await this.findOne(id);
    return await this.matchModel.findByIdAndUpdate(id, updateMatchDto, {
      new: true,
    });
  }

  private handleExceptions(error: any) {
    if (error.code === 11000) {
      console.log(error);
      throw new BadRequestException(
        `A match already exists with the same tournament, stage, matchDay, homeTeam, and awayTeam: ${JSON.stringify(error.keyValue)}`,
      );
    }
    console.log(error);
    throw new InternalServerErrorException(`Check Server logs`);
  }
}
