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

      // Enhanced validation for knockout stages
      await this.validateKnockoutStageConflicts(createKnockoutStageDto);

      const knockoutStage = await this.knockoutStageModel.create({
        ...createKnockoutStageDto,
        tournamentId: tournament._id,
        firstTeamId: firstTeam._id,
        secondTeamId: secondTeam._id,
        // Set isSingleMatch to true for finals unless explicitly set in DTO
        isSingleMatch:
          createKnockoutStageDto.isSingleMatch ??
          createKnockoutStageDto.knockoutStage === 'final',
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

      const firstTeam = {
        ...firstTeamId,
        teamId: {
          ...firstTeamId.teamId,
          logo: firstTeamId.teamId.logo
            ? `http://localhost:3000/uploads/${firstTeamId.teamId.logo}`
            : null,
        },
      };

      const secondTeam = {
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
        firstTeam: firstTeam,
        secondTeam: secondTeam,
        winnerTeam: winnerTeam,
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
          isSingleMatch: 1,
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
          firstTeamGoals: 1,
          secondTeamGoals: 1,
          firstTeamAggregateGoals: 1,
          secondTeamAggregateGoals: 1,
          firstLegPlayed: 1,
          secondLegPlayed: 1,
          isCompleted: 1,
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
      throw new NotFoundException(`Knockout stage with ID ${id} not found`);
    }

    return result[0] as KnockoutStageResponse;
  }

  async update(
    id: string,
    updateKnockoutStageDto: UpdateKnockoutStageDto,
  ): Promise<KnockoutStageResponse> {
    const { winnerTeamId, ...rest } = updateKnockoutStageDto;

    // TODO: Remove winnerTeamId from updateKnockoutStageDto
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

  /**
   * Validates knockout stage conflicts including:
   * 1. Swapped teams (A vs B = B vs A)
   * 2. Team participation conflicts (same team in multiple matchups)
   */
  private async validateKnockoutStageConflicts(
    createKnockoutStageDto: CreateKnockoutStageDto,
  ): Promise<void> {
    const { tournamentId, knockoutStage, firstTeamId, secondTeamId } =
      createKnockoutStageDto;

    // Find all existing knockout stages for the same tournament and knockout stage
    const existingStages = await this.knockoutStageModel
      .find({
        tournamentId: new Types.ObjectId(tournamentId),
        knockoutStage,
      })
      .lean();

    // Check for swapped teams (A vs B = B vs A)
    const hasSwappedTeamConflict = existingStages.some((stage) => {
      const existingFirstTeam = stage.firstTeamId.toString();
      const existingSecondTeam = stage.secondTeamId.toString();

      return (
        // Exact match (already handled by unique index, but checking for clarity)
        (existingFirstTeam === firstTeamId &&
          existingSecondTeam === secondTeamId) ||
        // Swapped teams
        (existingFirstTeam === secondTeamId &&
          existingSecondTeam === firstTeamId)
      );
    });

    if (hasSwappedTeamConflict) {
      throw new BadRequestException(
        `A knockout stage matchup already exists between these teams in ${knockoutStage} of this tournament (regardless of team order)`,
      );
    }

    // Check for team participation conflicts (same team in multiple matchups)
    const conflictingTeams = existingStages.filter((stage) => {
      const existingFirstTeam = stage.firstTeamId.toString();
      const existingSecondTeam = stage.secondTeamId.toString();

      return (
        existingFirstTeam === firstTeamId ||
        existingFirstTeam === secondTeamId ||
        existingSecondTeam === firstTeamId ||
        existingSecondTeam === secondTeamId
      );
    });

    if (conflictingTeams.length > 0) {
      // Get team names for better error message
      const [firstTeam, secondTeam] = await Promise.all([
        this.tournamentTeamService.findOne(firstTeamId),
        this.tournamentTeamService.findOne(secondTeamId),
      ]);

      const conflictingTeamNames: string[] = [];
      conflictingTeams.forEach((stage) => {
        const existingFirstTeam = stage.firstTeamId.toString();
        const existingSecondTeam = stage.secondTeamId.toString();

        if (
          existingFirstTeam === firstTeamId ||
          existingSecondTeam === firstTeamId
        ) {
          conflictingTeamNames.push(firstTeam.teamId.name as string);
        }
        if (
          existingFirstTeam === secondTeamId ||
          existingSecondTeam === secondTeamId
        ) {
          conflictingTeamNames.push(secondTeam.teamId.name as string);
        }
      });

      const uniqueConflictingTeams = [...new Set(conflictingTeamNames)];

      throw new BadRequestException(
        `The following team(s) are already participating in another ${knockoutStage} matchup in this tournament: ${uniqueConflictingTeams.join(', ')}`,
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
