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
import {
  DrawFormatMatch,
  DrawFormatResult,
} from './interfaces/draw-format.interface';
import { envs } from 'src/config/envs';

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
        firstTeam.isFromQualifyingStage,
        secondTeam.isFromQualifyingStage,
      );
      this.validateTeamParticipation(firstTeam, secondTeam);

      // Enhanced validation for qualifying stages
      await this.validateQualifyingStageConflicts(createQualifyingStageDto);

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

  async findAllByTournament(
    tournamentId: string,
  ): Promise<QualifyingStageResponse[]> {
    await this.tournamentService.findOne(tournamentId);

    const qualifyingStages = await this.qualifyingStageModel
      .find({ tournamentId: new Types.ObjectId(tournamentId) })
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
            ? `${envs.baseUrl}/uploads/${firstTeamId.teamId.logo}`
            : null,
        },
      };

      const awayTeam = {
        ...secondTeamId,
        teamId: {
          ...secondTeamId.teamId,
          logo: secondTeamId.teamId.logo
            ? `${envs.baseUrl}/uploads/${secondTeamId.teamId.logo}`
            : null,
        },
      };

      const winnerTeam = winnerTeamId
        ? {
            ...winnerTeamId,
            teamId: {
              ...winnerTeamId.teamId,
              logo: winnerTeamId.teamId.logo
                ? `${envs.baseUrl}/uploads/${winnerTeamId.teamId.logo}`
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
                    $concat: [envs.baseUrl, '/uploads/', '$firstTeamInfo.logo'],
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
                      envs.baseUrl,
                      '/uploads/',
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
                          envs.baseUrl,
                          '/uploads/',
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
          nextQualifyingStageMatchId: 1,
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

  private validateTeamParticipation(firstTeam: any, secondTeam: any): void {
    // Check if first team is still participating
    if (firstTeam.isParticipating === false) {
      throw new BadRequestException(
        `Team "${firstTeam.teamId.name}" has been eliminated from the tournament and cannot participate in new qualifying stages`,
      );
    }

    // Check if second team is still participating
    if (secondTeam.isParticipating === false) {
      throw new BadRequestException(
        `Team "${secondTeam.teamId.name}" has been eliminated from the tournament and cannot participate in new qualifying stages`,
      );
    }
  }

  /**
   * Validates qualifying stage conflicts including:
   * 1. Swapped teams (A vs B = B vs A)
   * 2. Team participation conflicts (same team in multiple matchups)
   */
  private async validateQualifyingStageConflicts(
    createQualifyingStageDto: CreateQualifyingStageDto,
  ): Promise<void> {
    const { tournamentId, qualifyingStage, firstTeamId, secondTeamId } =
      createQualifyingStageDto;

    // Find all existing qualifying stages for the same tournament and qualifying stage
    const existingStages = await this.qualifyingStageModel
      .find({
        tournamentId: new Types.ObjectId(tournamentId),
        qualifyingStage,
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
        `A qualifying stage matchup already exists between these teams in Stage ${qualifyingStage} of this tournament (regardless of team order)`,
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
        `The following team(s) are already participating in another Stage ${qualifyingStage} matchup in this tournament: ${uniqueConflictingTeams.join(', ')}`,
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

  // TODO: It remains to add the nextQualifyingStageMatchId to the draw format
  // TODO: It remains to be seen what happens if there are still qualifying stages to be played
  async getQualifyingStagesInDrawFormat(
    tournamentId: string,
  ): Promise<DrawFormatResult> {
    // Reusable function to create logo URL aggregation expression
    const logoUrlExpression = (logoField: any) => ({
      $let: {
        vars: {
          logoFile: logoField,
        },
        in: {
          $cond: {
            if: {
              $and: [
                { $ne: ['$$logoFile', null] },
                { $ne: ['$$logoFile', ''] },
              ],
            },
            then: {
              $concat: [envs.baseUrl, '/uploads/', '$$logoFile'],
            },
            else: null,
          },
        },
      },
    });

    // First validate the tournament exists
    await this.tournamentService.findOne(tournamentId);

    // Get the raw aggregate data
    const qualifyingStagesWithMatches =
      await this.qualifyingStageModel.aggregate([
        { $match: { tournamentId: new Types.ObjectId(tournamentId) } },

        // Lookup para matches
        {
          $lookup: {
            from: 'matches',
            localField: '_id',
            foreignField: 'qualifyingStageId',
            as: 'matches',
          },
        },

        // Lookup para firstTeam
        {
          $lookup: {
            from: 'tournamentteams',
            localField: 'firstTeamId',
            foreignField: '_id',
            as: 'firstTeamData',
          },
        },
        {
          $lookup: {
            from: 'teams',
            localField: 'firstTeamData.teamId',
            foreignField: '_id',
            as: 'firstTeamInfo',
          },
        },

        // Lookup para secondTeam
        {
          $lookup: {
            from: 'tournamentteams',
            localField: 'secondTeamId',
            foreignField: '_id',
            as: 'secondTeamData',
          },
        },
        {
          $lookup: {
            from: 'teams',
            localField: 'secondTeamData.teamId',
            foreignField: '_id',
            as: 'secondTeamInfo',
          },
        },

        // Lookup para winnerTeam
        {
          $lookup: {
            from: 'tournamentteams',
            localField: 'winnerTeamId',
            foreignField: '_id',
            as: 'winnerTeamData',
          },
        },
        {
          $lookup: {
            from: 'teams',
            localField: 'winnerTeamData.teamId',
            foreignField: '_id',
            as: 'winnerTeamInfo',
          },
        },

        // Restructurar la data
        {
          $project: {
            _id: 1,
            qualifyingStage: 1,
            firstTeamAggregateGoals: 1,
            secondTeamAggregateGoals: 1,
            firstLegPlayed: 1,
            secondLegPlayed: 1,
            penaltiesPlayed: 1,
            firstTeamPenaltyGoals: 1,
            secondTeamPenaltyGoals: 1,

            // Estructurar equipos
            firstTeam: {
              _id: { $arrayElemAt: ['$firstTeamData._id', 0] },
              teamInfo: {
                name: { $arrayElemAt: ['$firstTeamInfo.name', 0] },
                country: { $arrayElemAt: ['$firstTeamInfo.country', 0] },
                logo: logoUrlExpression({
                  $arrayElemAt: ['$firstTeamInfo.logo', 0],
                }),
              },
            },
            secondTeam: {
              _id: { $arrayElemAt: ['$secondTeamData._id', 0] },
              teamInfo: {
                name: { $arrayElemAt: ['$secondTeamInfo.name', 0] },
                country: { $arrayElemAt: ['$secondTeamInfo.country', 0] },
                logo: logoUrlExpression({
                  $arrayElemAt: ['$secondTeamInfo.logo', 0],
                }),
              },
            },
            winnerTeam: {
              $cond: {
                if: { $ne: ['$winnerTeamId', null] },
                then: {
                  _id: { $arrayElemAt: ['$winnerTeamData._id', 0] },
                  teamInfo: {
                    name: { $arrayElemAt: ['$winnerTeamInfo.name', 0] },
                    country: { $arrayElemAt: ['$winnerTeamInfo.country', 0] },
                    logo: logoUrlExpression({
                      $arrayElemAt: ['$winnerTeamInfo.logo', 0],
                    }),
                  },
                },
                else: null,
              },
            },

            // Organizar matches por tipo
            firstLegMatch: {
              $let: {
                vars: {
                  match: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$matches',
                          cond: { $eq: ['$$this.matchType', 'firstLeg'] },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: {
                  $cond: {
                    if: { $ne: ['$$match', null] },
                    then: {
                      _id: '$$match._id',
                      stage: '$$match.stage',
                      homeTeamId: '$$match.homeTeamId',
                      awayTeamId: '$$match.awayTeamId',
                      homeGoals: '$$match.homeGoals',
                      awayGoals: '$$match.awayGoals',
                      matchDate: '$$match.matchDate',
                      stadium: '$$match.stadium',
                      matchType: '$$match.matchType',
                      qualifyingStageId: '$$match.qualifyingStageId',
                      status: '$$match.status',
                    },
                    else: null,
                  },
                },
              },
            },
            secondLegMatch: {
              $let: {
                vars: {
                  match: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$matches',
                          cond: { $eq: ['$$this.matchType', 'secondLeg'] },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: {
                  $cond: {
                    if: { $ne: ['$$match', null] },
                    then: {
                      _id: '$$match._id',
                      stage: '$$match.stage',
                      homeTeamId: '$$match.homeTeamId',
                      awayTeamId: '$$match.awayTeamId',
                      homeGoals: '$$match.homeGoals',
                      awayGoals: '$$match.awayGoals',
                      matchDate: '$$match.matchDate',
                      stadium: '$$match.stadium',
                      matchType: '$$match.matchType',
                      qualifyingStageId: '$$match.qualifyingStageId',
                      status: '$$match.status',
                    },
                    else: null,
                  },
                },
              },
            },
          },
        },

        { $sort: { qualifyingStage: 1 } },
      ]);

    // Transform the data into the desired format
    return this.transformToDrawFormat(qualifyingStagesWithMatches);
  }

  private transformToDrawFormat(rawData: any[]): DrawFormatResult {
    // Group stages by qualifying stage number
    const phase1Stages = rawData.filter((stage) => stage.qualifyingStage === 1);
    const phase2Stages = rawData.filter((stage) => stage.qualifyingStage === 2);
    const phase3Stages = rawData.filter((stage) => stage.qualifyingStage === 3);

    // Transform each phase
    const phase1Matches = this.transformStagesToMatches(phase1Stages, 1);
    const phase2Matches = this.transformStagesToMatches(phase2Stages, 2);
    const phase3Matches = this.transformStagesToMatches(phase3Stages, 3);

    // Calculate summary
    const totalMatches = rawData.length;
    const completedMatches = rawData.filter((stage) => stage.winnerTeam).length;

    return {
      phase1: phase1Matches,
      phase2: phase2Matches,
      phase3: phase3Matches,
      summary: {
        totalMatches,
        phase1Matches: phase1Matches.length,
        phase2Matches: phase2Matches.length,
        phase3Matches: phase3Matches.length,
        completedMatches,
        pendingMatches: totalMatches - completedMatches,
      },
    };
  }

  private transformStagesToMatches(
    stages: any[],
    phaseNumber: number,
  ): DrawFormatMatch[] {
    return stages.map((stage, index) => {
      return {
        // Keep all original properties
        _id: stage._id,
        qualifyingStage: stage.qualifyingStage,
        firstTeamAggregateGoals: stage.firstTeamAggregateGoals,
        secondTeamAggregateGoals: stage.secondTeamAggregateGoals,
        firstLegPlayed: stage.firstLegPlayed,
        secondLegPlayed: stage.secondLegPlayed,
        penaltiesPlayed: stage.penaltiesPlayed,
        firstTeamPenaltyGoals: stage.firstTeamPenaltyGoals,
        secondTeamPenaltyGoals: stage.secondTeamPenaltyGoals,
        firstTeam: stage.firstTeam,
        secondTeam: stage.secondTeam,
        winnerTeam: stage.winnerTeam
          ? stage.winnerTeam
          : {
              _id: null,
              teamInfo: {
                name: `Winner of ${this.toTitleCase(stage.firstTeam.teamInfo.name)} vs ${this.toTitleCase(stage.secondTeam.teamInfo.name)}`,
                country: null,
                logo: null,
              },
            },
        firstLegMatch: stage.firstLegMatch,
        secondLegMatch: stage.secondLegMatch,

        // Add the draw format properties
        id: `phase${phaseNumber}-match-${index + 1}`,
        matchNumber: index + 1,
        stage: phaseNumber,
      };
    });
  }

  private toTitleCase(str: string): string {
    return str.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase(),
    );
  }
}
