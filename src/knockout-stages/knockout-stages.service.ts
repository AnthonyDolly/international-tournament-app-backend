import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateKnockoutStageDto } from './dto/create-knockout-stage.dto';
import { UpdateKnockoutStageDto } from './dto/update-knockout-stage.dto';
import { InjectModel } from '@nestjs/mongoose';
import { KnockoutStage } from './entities/knockout-stage.entity';
import { Model, Types } from 'mongoose';
import { TournamentsService } from 'src/tournaments/tournaments.service';
import { TournamentTeamsService } from 'src/tournament-teams/tournament-teams.service';
import { KnockoutStageResponse } from './interfaces/knockout-stage.interface';

@Injectable()
export class KnockoutStagesService {
  constructor(
    @InjectModel(KnockoutStage.name)
    private readonly knockoutStageModel: Model<KnockoutStage>,
    private readonly tournamentService: TournamentsService,
    private readonly tournamentTeamService: TournamentTeamsService,
  ) {}

  async create(
    createKnockoutStageDto: CreateKnockoutStageDto,
  ): Promise<KnockoutStageResponse> {
    try {
      const [tournament, firstTeam, secondTeam] =
        await this.fetchRequiredEntities(createKnockoutStageDto);

      this.validateTeamTournamentRelation(
        tournament._id,
        firstTeam.tournamentId._id,
        secondTeam.tournamentId._id,
      );
      this.validateTeamDifference(firstTeam.teamId._id, secondTeam.teamId._id);

      const knockoutStage = await this.knockoutStageModel.create({
        ...createKnockoutStageDto,
        tournamentId: tournament._id,
        firstTeamId: firstTeam._id,
        secondTeamId: secondTeam._id,
      });

      return this.findOne(knockoutStage._id.toString());
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findAll(): Promise<KnockoutStageResponse[]> {
    const knockoutStages = await this.knockoutStageModel
      .find()
      .populate({
        path: 'tournamentId',
        select: 'name year',
      })
      .populate({
        path: 'firstTeamId',
        select: 'teamId',
        populate: {
          path: 'teamId',
          select: '-_id name logo',
        },
      })
      .populate({
        path: 'secondTeamId',
        select: 'teamId',
        populate: {
          path: 'teamId',
          select: '-_id name logo',
        },
      })
      .populate({
        path: 'winnerTeamId',
        select: 'teamId',
        populate: {
          path: 'teamId',
          select: '-_id name logo',
        },
      })
      .lean();

    return knockoutStages.map((stage) => {
      const { tournamentId, firstTeamId, secondTeamId, winnerTeamId, ...rest } =
        stage;
      const transformedStage = {
        ...rest,
        tournament: tournamentId,
        firstTeam: firstTeamId,
        secondTeam: secondTeamId,
        winnerTeam: winnerTeamId,
      };
      return transformedStage as unknown as KnockoutStageResponse;
    });
  }

  async findOne(id: string): Promise<KnockoutStageResponse> {
    const objectId = new Types.ObjectId(id);

    const result = await this.knockoutStageModel.aggregate([
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
          localField: 'firstTeamId',
          foreignField: '_id',
          as: 'firstTeam',
        },
      },
      { $unwind: '$firstTeam' },
      {
        $lookup: {
          from: 'tournamentteams',
          localField: 'secondTeamId',
          foreignField: '_id',
          as: 'secondTeam',
        },
      },
      { $unwind: '$secondTeam' },
      {
        $lookup: {
          from: 'teams',
          localField: 'firstTeam.teamId',
          foreignField: '_id',
          as: 'firstTeamInfo',
        },
      },
      { $unwind: '$firstTeamInfo' },
      {
        $lookup: {
          from: 'teams',
          localField: 'secondTeam.teamId',
          foreignField: '_id',
          as: 'secondTeamInfo',
        },
      },
      { $unwind: '$secondTeamInfo' },
      {
        $lookup: {
          from: 'tournamentteams',
          localField: 'winnerTeamId',
          foreignField: '_id',
          as: 'winnerTeam',
        },
      },
      {
        $lookup: {
          from: 'teams',
          let: { winnerTeamId: { $arrayElemAt: ['$winnerTeam.teamId', 0] } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$winnerTeamId'] },
              },
            },
          ],
          as: 'winnerTeamInfo',
        },
      },
      {
        $project: {
          _id: 1,
          knockoutStage: 1,
          tournament: {
            name: '$tournament.name',
            year: '$tournament.year',
            _id: '$tournament._id',
          },
          firstTeam: {
            _id: '$firstTeam._id',
            team: {
              name: '$firstTeamInfo.name',
              logo: '$firstTeamInfo.logo',
              _id: '$firstTeamInfo._id',
            },
          },
          secondTeam: {
            _id: '$secondTeam._id',
            team: {
              name: '$secondTeamInfo.name',
              logo: '$secondTeamInfo.logo',
              _id: '$secondTeamInfo._id',
            },
          },
          firstTeamAggregateGoals: 1,
          secondTeamAggregateGoals: 1,
          winnerTeam: {
            $cond: {
              if: { $gt: [{ $size: '$winnerTeam' }, 0] },
              then: {
                _id: { $arrayElemAt: ['$winnerTeam._id', 0] },
                team: {
                  name: { $arrayElemAt: ['$winnerTeamInfo.name', 0] },
                  logo: { $arrayElemAt: ['$winnerTeamInfo.logo', 0] },
                  _id: { $arrayElemAt: ['$winnerTeamInfo._id', 0] },
                },
              },
              else: null,
            },
          },
        },
      },
    ]);

    if (!result.length) {
      throw new NotFoundException(`Knockout stage with ID ${id} not found`);
    }

    return result[0] as KnockoutStageResponse;
  }

  async update(
    id: string,
    updateKnockoutStageDto: UpdateKnockoutStageDto,
  ): Promise<KnockoutStageResponse> {
    const { winnerTeamId, ...rest } = updateKnockoutStageDto;

    if (winnerTeamId) {
      const [knockoutStage, winnerTeam] = await Promise.all([
        this.knockoutStageModel
          .findById(id)
          .select('firstTeamId secondTeamId')
          .lean(),
        this.tournamentTeamService.findOne(winnerTeamId),
      ]);

      if (!knockoutStage) {
        throw new NotFoundException(`Knockout stage with ID ${id} not found`);
      }

      const validTeamIds = [
        knockoutStage.firstTeamId.toString(),
        knockoutStage.secondTeamId.toString(),
      ];

      if (!validTeamIds.includes(winnerTeam._id.toString())) {
        throw new BadRequestException(
          'winnerTeamId must be the first or second team',
        );
      }
    }

    const updatedStage = await this.knockoutStageModel
      .findByIdAndUpdate(
        id,
        {
          ...rest,
          winnerTeamId: winnerTeamId ? new Types.ObjectId(winnerTeamId) : null,
        },
        { new: true },
      )
      .lean();

    if (!updatedStage) {
      throw new NotFoundException(`Knockout stage with ID ${id} not found`);
    }

    return this.findOne(id);
  }

  private async fetchRequiredEntities(
    createKnockoutStageDto: CreateKnockoutStageDto,
  ) {
    if (
      !createKnockoutStageDto.tournamentId ||
      !createKnockoutStageDto.firstTeamId ||
      !createKnockoutStageDto.secondTeamId
    ) {
      throw new BadRequestException(
        'Missing required fields: tournamentId, firstTeamId, or secondTeamId',
      );
    }

    return Promise.all([
      this.tournamentService.findOne(createKnockoutStageDto.tournamentId),
      this.tournamentTeamService.findOne(createKnockoutStageDto.firstTeamId),
      this.tournamentTeamService.findOne(createKnockoutStageDto.secondTeamId),
    ]);
  }

  private validateTeamTournamentRelation(
    tournamentId: Types.ObjectId,
    firstTeamId: Types.ObjectId,
    secondTeamId: Types.ObjectId,
  ): void {
    if (
      tournamentId.toString() !== firstTeamId.toString() ||
      tournamentId.toString() !== secondTeamId.toString()
    ) {
      throw new BadRequestException(
        'Both teams must belong to the specified tournament',
      );
    }
  }

  private validateTeamDifference(
    firstTeamId: Types.ObjectId,
    secondTeamId: Types.ObjectId,
  ): void {
    if (firstTeamId.toString() === secondTeamId.toString()) {
      throw new BadRequestException(
        'Cannot create a knockout stage with the same team',
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
        `A knockout stage already exists with the same tournament and teams: ${JSON.stringify(
          error.keyValue,
        )}`,
      );
    }

    console.error('Unexpected error:', error);
    throw new InternalServerErrorException(
      'An unexpected error occurred. Please check server logs.',
    );
  }
}
