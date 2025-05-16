import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Match } from './entities/match.entity';
import { Model, Types } from 'mongoose';
import { TournamentsService } from 'src/tournaments/tournaments.service';
import { TournamentTeamsService } from 'src/tournament-teams/tournament-teams.service';
import { GroupClassificationService } from 'src/group-classification/group-classification.service';
import { MatchResponse } from './interfaces/match.interface';

@Injectable()
export class MatchesService {
  constructor(
    @InjectModel(Match.name) private readonly matchModel: Model<Match>,
    private readonly tournamentService: TournamentsService,
    private readonly tournamentTeamService: TournamentTeamsService,
    private readonly groupClassificationService: GroupClassificationService,
  ) {}

  async create(createMatchDto: CreateMatchDto): Promise<MatchResponse> {
    try {
      const { groupId, ...matchData } = createMatchDto;

      this.validateMatchDay(matchData);

      const [groupClassification, tournament, homeTeam, awayTeam] =
        await this.fetchRequiredEntities(matchData, groupId);

      this.validateTeamTournamentRelation(
        tournament._id,
        homeTeam.tournamentId._id,
        awayTeam.tournamentId._id,
      );
      this.validateTeamDifference(homeTeam.teamId._id, awayTeam.teamId._id);
      this.validateTeamsInGroup(groupClassification, matchData);

      const match = await this.matchModel.create({
        ...matchData,
        tournamentId: tournament._id,
        homeTeamId: homeTeam._id,
        awayTeamId: awayTeam._id,
      });

      return this.findOne(match._id.toString());
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findAll(): Promise<MatchResponse[]> {
    const matches = await this.matchModel
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
      })
      .lean();

    return matches.map((match) => {
      const { tournamentId, homeTeamId, awayTeamId, ...rest } = match;
      const transformedMatch = {
        ...rest,
        tournament: tournamentId,
        homeTeam: homeTeamId,
        awayTeam: awayTeamId,
      };
      return transformedMatch as unknown as MatchResponse;
    });
  }

  async findOne(id: string): Promise<MatchResponse> {
    const objectId = new Types.ObjectId(id);

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

    if (!result.length) {
      throw new NotFoundException(`Match with ID ${id} not found`);
    }

    return result[0] as MatchResponse;
  }

  async update(
    id: string,
    updateMatchDto: UpdateMatchDto,
  ): Promise<MatchResponse> {
    await this.findOne(id);

    const updatedMatch = await this.matchModel
      .findByIdAndUpdate(id, updateMatchDto, { new: true })
      .lean();

    if (!updatedMatch) {
      throw new NotFoundException(`Match with ID ${id} not found`);
    }

    return this.findOne(id);
  }

  private validateMatchDay(matchData: Partial<CreateMatchDto>): void {
    if (matchData.stage === 'groupStage' && !matchData.matchDay) {
      throw new BadRequestException(
        'Match day is required for group stage matches (1-6)',
      );
    }
  }

  private async fetchRequiredEntities(
    matchData: Partial<CreateMatchDto>,
    groupId: string,
  ) {
    if (
      !matchData.tournamentId ||
      !matchData.homeTeamId ||
      !matchData.awayTeamId
    ) {
      throw new BadRequestException(
        'Missing required fields: tournamentId, homeTeamId, or awayTeamId',
      );
    }

    return Promise.all([
      this.groupClassificationService.findByTournamentIdAndGroupId(
        matchData.tournamentId,
        groupId,
      ),
      this.tournamentService.findOne(matchData.tournamentId),
      this.tournamentTeamService.findOne(matchData.homeTeamId),
      this.tournamentTeamService.findOne(matchData.awayTeamId),
    ]);
  }

  private validateTeamTournamentRelation(
    tournamentId: Types.ObjectId,
    homeTeamId: Types.ObjectId,
    awayTeamId: Types.ObjectId,
  ): void {
    if (
      tournamentId.toString() !== homeTeamId.toString() ||
      tournamentId.toString() !== awayTeamId.toString()
    ) {
      throw new BadRequestException(
        'One or both teams are not part of the specified tournament',
      );
    }
  }

  private validateTeamDifference(
    homeTeamId: Types.ObjectId,
    awayTeamId: Types.ObjectId,
  ): void {
    if (homeTeamId.toString() === awayTeamId.toString()) {
      throw new BadRequestException(
        'Home team and away team cannot be the same',
      );
    }
  }

  private validateTeamsInGroup(
    groupClassification: any,
    matchData: Partial<CreateMatchDto>,
  ): void {
    if (!matchData.homeTeamId || !matchData.awayTeamId) {
      throw new BadRequestException(
        'Missing required fields: homeTeamId or awayTeamId',
      );
    }

    const teams = groupClassification.groups[0].teams;
    const inGroup = (id: string) =>
      teams.some((t) => t.tournamentTeamId.toString() === id.toString());

    if (!inGroup(matchData.homeTeamId) || !inGroup(matchData.awayTeamId)) {
      throw new BadRequestException(
        'One or both teams are not in the specified group',
      );
    }
  }

  private handleExceptions(error: any): never {
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException
    ) {
      throw error;
    }

    if (error.code === 11000) {
      throw new BadRequestException(
        `A match already exists with the same tournament, stage, matchDay, homeTeam, and awayTeam: ${JSON.stringify(error.keyValue)}`,
      );
    }

    console.error('Unexpected error:', error);
    throw new InternalServerErrorException(
      'An unexpected error occurred. Please check server logs.',
    );
  }
}
