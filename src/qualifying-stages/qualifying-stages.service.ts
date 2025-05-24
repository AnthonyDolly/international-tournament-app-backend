import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateQualifyingStageDto } from './dto/create-qualifying-stage.dto';
import { UpdateQualifyingStageDto } from './dto/update-qualifying-stage.dto';
import { InjectModel } from '@nestjs/mongoose';
import { QualifyingStage } from './entities/qualifying-stage.entity';
import { Model, Types } from 'mongoose';
import { TournamentsService } from 'src/tournaments/tournaments.service';
import { TournamentTeamsService } from 'src/tournament-teams/tournament-teams.service';
import { QualifyingStageResponse } from './interfaces/qualifying-stage.interface';

@Injectable()
export class QualifyingStagesService {
  constructor(
    @InjectModel(QualifyingStage.name)
    private readonly qualifyingStageModel: Model<QualifyingStage>,
    private readonly tournamentService: TournamentsService,
    private readonly tournamentTeamService: TournamentTeamsService,
  ) {}

  async create(
    createQualifyingStageDto: CreateQualifyingStageDto,
  ): Promise<QualifyingStageResponse> {
    try {
      const [tournament, firstTeam, secondTeam] =
        await this.fetchRequiredEntities(createQualifyingStageDto);

      this.validateTeamTournamentRelation(
        tournament._id,
        firstTeam.tournamentId._id,
        secondTeam.tournamentId._id,
      );
      this.validateTeamDifference(firstTeam.teamId._id, secondTeam.teamId._id);
      this.validateTeamsFromQualifiers(
        firstTeam.teamId.isFromQualifiers,
        secondTeam.teamId.isFromQualifiers,
      );

      const qualifyingStage = await this.qualifyingStageModel.create({
        ...createQualifyingStageDto,
        tournamentId: tournament._id,
        firstTeamId: firstTeam._id,
        secondTeamId: secondTeam._id,
      });

      return this.findOne(qualifyingStage._id.toString());
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findAll(): Promise<QualifyingStageResponse[]> {
    const qualifyingStages = await this.qualifyingStageModel
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

    return qualifyingStages.map((stage) => {
      const { tournamentId, firstTeamId, secondTeamId, winnerTeamId, ...rest } =
        stage;

      const homeTeam = {
        ...firstTeamId,
        teamId: {
          ...firstTeamId.teamId,
          logo: firstTeamId.teamId.logo
            ? `http://localhost:3000/uploads/${firstTeamId.teamId.logo}`
            : null,
        },
      };

      const awayTeam = {
        ...secondTeamId,
        teamId: {
          ...secondTeamId.teamId,
          logo: secondTeamId.teamId.logo
            ? `http://localhost:3000/uploads/${secondTeamId.teamId.logo}`
            : null,
        },
      };

      const winnerTeam = winnerTeamId
        ? {
            ...winnerTeamId,
            teamId: {
              ...winnerTeamId.teamId,
              logo: winnerTeamId.teamId.logo
                ? `http://localhost:3000/uploads/${winnerTeamId.teamId.logo}`
                : null,
            },
          }
        : null;

      const transformedStage = {
        ...rest,
        tournament: tournamentId,
        firstTeam: homeTeam,
        secondTeam: awayTeam,
        winnerTeam: winnerTeam,
      };
      return transformedStage as unknown as QualifyingStageResponse;
    });
  }

  async findOne(id: string): Promise<QualifyingStageResponse> {
    const objectId = new Types.ObjectId(id);

    const result = await this.qualifyingStageModel.aggregate([
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
          qualifyingStage: 1,
          tournament: {
            name: '$tournament.name',
            year: '$tournament.year',
            _id: '$tournament._id',
          },
          firstTeam: {
            _id: '$firstTeam._id',
            team: {
              name: '$firstTeamInfo.name',
              logo: {
                $cond: {
                  if: '$firstTeamInfo.logo',
                  then: {
                    $concat: [
                      'http://localhost:3000/uploads/',
                      '$firstTeamInfo.logo',
                    ],
                  },
                  else: null,
                },
              },
            },
          },
          secondTeam: {
            _id: '$secondTeam._id',
            team: {
              name: '$secondTeamInfo.name',
              logo: {
                $cond: {
                  if: '$secondTeamInfo.logo',
                  then: {
                    $concat: [
                      'http://localhost:3000/uploads/',
                      '$secondTeamInfo.logo',
                    ],
                  },
                  else: null,
                },
              },
            },
          },
          firstTeamAggregateGoals: 1,
          secondTeamAggregateGoals: 1,
          firstLegPlayed: 1,
          secondLegPlayed: 1,
          penaltiesPlayed: 1,
          firstTeamPenaltyGoals: 1,
          secondTeamPenaltyGoals: 1,
          winnerTeam: {
            $cond: {
              if: { $gt: [{ $size: '$winnerTeam' }, 0] },
              then: {
                _id: { $arrayElemAt: ['$winnerTeam._id', 0] },
                team: {
                  name: { $arrayElemAt: ['$winnerTeamInfo.name', 0] },
                  logo: {
                    $cond: {
                      if: { $arrayElemAt: ['$winnerTeamInfo.logo', 0] },
                      then: {
                        $concat: [
                          'http://localhost:3000/uploads/',
                          { $arrayElemAt: ['$winnerTeamInfo.logo', 0] },
                        ],
                      },
                      else: null,
                    },
                  },
                },
              },
              else: null,
            },
          },
        },
      },
    ]);

    if (!result.length) {
      throw new NotFoundException(`Qualifying stage with ID ${id} not found`);
    }

    return result[0] as QualifyingStageResponse;
  }

  async update(
    id: string,
    updateQualifyingStageDto: UpdateQualifyingStageDto,
  ): Promise<QualifyingStageResponse> {
    const { winnerTeamId, ...rest } = updateQualifyingStageDto;

    // TODO: Remove winnerTeamId from updateQualifyingStageDto
    if (winnerTeamId) {
      const [qualifyingStage, winnerTeam] = await Promise.all([
        this.qualifyingStageModel
          .findById(id)
          .select('firstTeamId secondTeamId')
          .lean(),
        this.tournamentTeamService.findOne(winnerTeamId),
      ]);

      if (!qualifyingStage) {
        throw new NotFoundException(`Qualifying stage with ID ${id} not found`);
      }

      const validTeamIds = [
        qualifyingStage.firstTeamId.toString(),
        qualifyingStage.secondTeamId.toString(),
      ];

      if (!validTeamIds.includes(winnerTeam._id.toString())) {
        throw new BadRequestException(
          'winnerTeamId must be the first or second team',
        );
      }
    }

    const updatedStage = await this.qualifyingStageModel
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
      throw new NotFoundException(`Qualifying stage with ID ${id} not found`);
    }

    return this.findOne(id);
  }

  private async fetchRequiredEntities(
    createQualifyingStageDto: CreateQualifyingStageDto,
  ) {
    if (
      !createQualifyingStageDto.tournamentId ||
      !createQualifyingStageDto.firstTeamId ||
      !createQualifyingStageDto.secondTeamId
    ) {
      throw new BadRequestException(
        'Missing required fields: tournamentId, firstTeamId, or secondTeamId',
      );
    }

    return Promise.all([
      this.tournamentService.findOne(createQualifyingStageDto.tournamentId),
      this.tournamentTeamService.findOne(createQualifyingStageDto.firstTeamId),
      this.tournamentTeamService.findOne(createQualifyingStageDto.secondTeamId),
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
        'Cannot create a qualifying stage with the same team',
      );
    }
  }

  private validateTeamsFromQualifiers(
    firstTeamFromQualifiers: boolean,
    secondTeamFromQualifiers: boolean,
  ): void {
    if (!firstTeamFromQualifiers || !secondTeamFromQualifiers) {
      throw new BadRequestException(
        'Both teams must be from qualifiers to participate in qualifying stages',
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
        `A qualifying stage already exists with the same tournament and teams: ${JSON.stringify(
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
