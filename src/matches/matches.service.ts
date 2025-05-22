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
import { QualifyingStagesService } from 'src/qualifying-stages/qualifying-stages.service';
import { KnockoutStagesService } from 'src/knockout-stages/knockout-stages.service';
import { MatchResponse } from './interfaces/match.interface';

@Injectable()
export class MatchesService {
  constructor(
    @InjectModel(Match.name) private readonly matchModel: Model<Match>,
    private readonly tournamentService: TournamentsService,
    private readonly tournamentTeamService: TournamentTeamsService,
    private readonly groupClassificationService: GroupClassificationService,
    private readonly qualifyingStagesService: QualifyingStagesService,
    private readonly knockoutStagesService: KnockoutStagesService,
  ) {}

  async create(createMatchDto: CreateMatchDto): Promise<MatchResponse> {
    try {
      const { groupId, qualifyingStageId, knockoutStageId, ...matchData } =
        createMatchDto;

      this.validateMatchDay(matchData);
      this.validateStageSpecificFields(
        matchData,
        qualifyingStageId,
        knockoutStageId,
      );
      await this.validateStageTournamentRelations(
        matchData,
        qualifyingStageId,
        knockoutStageId,
      );

      const [groupClassification, tournament, homeTeam, awayTeam] =
        await this.fetchRequiredEntities(matchData, groupId);

      this.validateTeamTournamentRelation(
        tournament._id,
        homeTeam.tournamentId._id,
        awayTeam.tournamentId._id,
      );
      this.validateTeamDifference(homeTeam.teamId._id, awayTeam.teamId._id);

      if (matchData.stage === 'qualifyingStage') {
        await this.validateTeamsInQualifyingStage(
          qualifyingStageId,
          homeTeam._id.toString(),
          awayTeam._id.toString(),
        );
      } else if (matchData.stage === 'groupStage') {
        this.validateTeamsInGroup(groupClassification, matchData);
      } else if (matchData.stage === 'knockoutStage') {
        this.validateTeamsInKnockoutStage(
          knockoutStageId,
          homeTeam._id.toString(),
          awayTeam._id.toString(),
        );
      }

      const match = await this.matchModel.create({
        ...matchData,
        tournamentId: tournament._id,
        homeTeamId: homeTeam._id,
        awayTeamId: awayTeam._id,
        qualifyingStageId: qualifyingStageId
          ? new Types.ObjectId(qualifyingStageId)
          : null,
        knockoutStageId: knockoutStageId
          ? new Types.ObjectId(knockoutStageId)
          : null,
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
      .populate({
        path: 'qualifyingStageId',
        select: 'qualifyingStage',
      })
      .populate({
        path: 'knockoutStageId',
        select: 'knockoutStage',
      })
      .lean();

    return matches.map((match) => {
      const {
        tournamentId,
        homeTeamId,
        awayTeamId,
        qualifyingStageId,
        knockoutStageId,
        ...rest
      } = match;

      // Format home team logo
      const homeTeam = {
        ...homeTeamId,
        teamId: {
          ...homeTeamId.teamId,
          logo: homeTeamId.teamId.logo
            ? `http://localhost:3000/uploads/${homeTeamId.teamId.logo}`
            : null,
        },
      };

      // Format away team logo
      const awayTeam = {
        ...awayTeamId,
        teamId: {
          ...awayTeamId.teamId,
          logo: awayTeamId.teamId.logo
            ? `http://localhost:3000/uploads/${awayTeamId.teamId.logo}`
            : null,
        },
      };

      const transformedMatch = {
        ...rest,
        tournament: tournamentId,
        homeTeam,
        awayTeam,
        qualifyingStage: qualifyingStageId,
        knockoutStage: knockoutStageId,
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
          group: {
            name: '$group.name',
            _id: '$group._id',
          },
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
        $lookup: {
          from: 'qualifyingstages',
          localField: 'qualifyingStageId',
          foreignField: '_id',
          as: 'qualifyingStage',
        },
      },
      {
        $lookup: {
          from: 'knockoutstages',
          localField: 'knockoutStageId',
          foreignField: '_id',
          as: 'knockoutStage',
        },
      },
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
              logo: {
                $cond: {
                  if: '$homeTeamInfo.logo',
                  then: {
                    $concat: [
                      'http://localhost:3000/uploads/',
                      '$homeTeamInfo.logo',
                    ],
                  },
                  else: null,
                },
              },
            },
          },
          awayTeam: {
            _id: '$awayTeam._id',
            team: {
              name: '$awayTeamInfo.name',
              logo: {
                $cond: {
                  if: '$awayTeamInfo.logo',
                  then: {
                    $concat: [
                      'http://localhost:3000/uploads/',
                      '$awayTeamInfo.logo',
                    ],
                  },
                  else: null,
                },
              },
            },
          },
          homeGoals: 1,
          awayGoals: 1,
          stage: 1,
          group: {
            $cond: {
              if: { $eq: ['$stage', 'groupStage'] },
              then: {
                name: '$group.name',
                _id: '$group._id',
              },
              else: null,
            },
          },
          matchDay: 1,
          matchType: 1,
          stadium: 1,
          status: 1,
          qualifyingStage: {
            $cond: {
              if: { $gt: [{ $size: '$qualifyingStage' }, 0] },
              then: {
                _id: { $arrayElemAt: ['$qualifyingStage._id', 0] },
                qualifyingStage: {
                  $arrayElemAt: ['$qualifyingStage.qualifyingStage', 0],
                },
              },
              else: null,
            },
          },
          knockoutStage: {
            $cond: {
              if: { $gt: [{ $size: '$knockoutStage' }, 0] },
              then: {
                _id: { $arrayElemAt: ['$knockoutStage._id', 0] },
                knockoutStage: {
                  $arrayElemAt: ['$knockoutStage.knockoutStage', 0],
                },
              },
              else: null,
            },
          },
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
    const { qualifyingStageId, knockoutStageId, ...rest } = updateMatchDto;

    const match = await this.findOne(id);

    // Check if match can be updated
    if (match.status === 'finished') {
      throw new BadRequestException(
        'Cannot update a finished match. Create a new one instead.',
      );
    }

    const updatedMatch = await this.matchModel
      .findByIdAndUpdate(
        id,
        {
          ...rest,
          qualifyingStageId: qualifyingStageId
            ? new Types.ObjectId(qualifyingStageId)
            : null,
          knockoutStageId: knockoutStageId
            ? new Types.ObjectId(knockoutStageId)
            : null,
        },
        { new: true },
      )
      .lean();

    if (!updatedMatch) {
      throw new NotFoundException(`Match with ID ${id} not found`);
    }

    // Update group classification if it's a group stage match changing from pending to finished
    if (
      match.stage === 'groupStage' &&
      match.status === 'pending' &&
      updateMatchDto.status === 'finished' &&
      updateMatchDto.homeGoals !== null &&
      updateMatchDto.awayGoals !== null
    ) {
      const homeTeamWon = updateMatchDto.homeGoals > updateMatchDto.awayGoals;
      const awayTeamWon = updateMatchDto.awayGoals > updateMatchDto.homeGoals;
      const isDraw = updateMatchDto.homeGoals === updateMatchDto.awayGoals;

      const classifications = [
        {
          tournamentTeamId: match.homeTeam._id.toString(),
          matchesPlayed: 1,
          wins: homeTeamWon ? 1 : 0,
          draws: isDraw ? 1 : 0,
          losses: awayTeamWon ? 1 : 0,
          goalsFor: updateMatchDto.homeGoals,
          goalsAgainst: updateMatchDto.awayGoals,
          points: homeTeamWon ? 3 : isDraw ? 1 : 0,
        },
        {
          tournamentTeamId: match.awayTeam._id.toString(),
          matchesPlayed: 1,
          wins: awayTeamWon ? 1 : 0,
          draws: isDraw ? 1 : 0,
          losses: homeTeamWon ? 1 : 0,
          goalsFor: updateMatchDto.awayGoals,
          goalsAgainst: updateMatchDto.homeGoals,
          points: awayTeamWon ? 3 : isDraw ? 1 : 0,
        },
      ];

      await this.groupClassificationService.update({
        groupId: match.group,
        classifications,
      });
    }

    return this.findOne(id);
  }

  private async validateStageTournamentRelations(
    matchData: Partial<CreateMatchDto>,
    qualifyingStageId?: string | null,
    knockoutStageId?: string | null,
  ): Promise<void> {
    if (qualifyingStageId) {
      const qualifyingStage =
        await this.qualifyingStagesService.findOne(qualifyingStageId);
      if (
        qualifyingStage.tournament._id.toString() !== matchData.tournamentId
      ) {
        throw new BadRequestException(
          'qualifyingStageId must belong to the same tournament',
        );
      }
    }

    if (knockoutStageId) {
      const knockoutStage =
        await this.knockoutStagesService.findOne(knockoutStageId);
      if (knockoutStage.tournament._id.toString() !== matchData.tournamentId) {
        throw new BadRequestException(
          'knockoutStageId must belong to the same tournament',
        );
      }
    }
  }

  private validateMatchDay(matchData: Partial<CreateMatchDto>): void {
    if (matchData.stage === 'groupStage' && !matchData.matchDay) {
      throw new BadRequestException(
        'Match day is required for group stage matches (1-6)',
      );
    }
  }

  private readonly STAGE_VALIDATION_MESSAGES = {
    QUALIFYING_STAGE: {
      MATCH_DAY: 'matchDay must be null for qualifying stage matches',
      MATCH_TYPE: 'matchType is required for qualifying stage matches',
      QUALIFYING_STAGE_ID:
        'qualifyingStageId is required for qualifying stage matches',
      KNOCKOUT_STAGE_ID:
        'knockoutStageId must be null for qualifying stage matches',
    },
    GROUP_STAGE: {
      MATCH_DAY: 'matchDay is required for group stage matches',
      MATCH_TYPE: 'matchType must be null for group stage matches',
      QUALIFYING_STAGE_ID:
        'qualifyingStageId must be null for group stage matches',
      KNOCKOUT_STAGE_ID: 'knockoutStageId must be null for group stage matches',
    },
    KNOCKOUT_STAGE: {
      MATCH_DAY: 'matchDay must be null for knockout stage matches',
      MATCH_TYPE: 'matchType is required for knockout stage matches',
      QUALIFYING_STAGE_ID:
        'qualifyingStageId must be null for knockout stage matches',
      KNOCKOUT_STAGE_ID:
        'knockoutStageId is required for knockout stage matches',
    },
    INVALID_STAGE: 'Invalid stage value',
  } as const;

  private validateQualifyingStage(
    matchData: Partial<CreateMatchDto>,
    qualifyingStageId?: string | null,
    knockoutStageId?: string | null,
  ): void {
    if (matchData.matchDay !== null && matchData.matchDay !== undefined) {
      throw new BadRequestException(
        this.STAGE_VALIDATION_MESSAGES.QUALIFYING_STAGE.MATCH_DAY,
      );
    }
    if (!matchData.matchType) {
      throw new BadRequestException(
        this.STAGE_VALIDATION_MESSAGES.QUALIFYING_STAGE.MATCH_TYPE,
      );
    }
    if (!qualifyingStageId) {
      throw new BadRequestException(
        this.STAGE_VALIDATION_MESSAGES.QUALIFYING_STAGE.QUALIFYING_STAGE_ID,
      );
    }
    if (knockoutStageId !== undefined && knockoutStageId !== null) {
      throw new BadRequestException(
        this.STAGE_VALIDATION_MESSAGES.QUALIFYING_STAGE.KNOCKOUT_STAGE_ID,
      );
    }
  }

  private validateGroupStage(
    matchData: Partial<CreateMatchDto>,
    qualifyingStageId?: string | null,
    knockoutStageId?: string | null,
  ): void {
    if (!matchData.matchDay) {
      throw new BadRequestException(
        this.STAGE_VALIDATION_MESSAGES.GROUP_STAGE.MATCH_DAY,
      );
    }
    if (matchData.matchType !== undefined && matchData.matchType !== null) {
      throw new BadRequestException(
        this.STAGE_VALIDATION_MESSAGES.GROUP_STAGE.MATCH_TYPE,
      );
    }
    if (qualifyingStageId !== undefined && qualifyingStageId !== null) {
      throw new BadRequestException(
        this.STAGE_VALIDATION_MESSAGES.GROUP_STAGE.QUALIFYING_STAGE_ID,
      );
    }
    if (knockoutStageId !== undefined && knockoutStageId !== null) {
      throw new BadRequestException(
        this.STAGE_VALIDATION_MESSAGES.GROUP_STAGE.KNOCKOUT_STAGE_ID,
      );
    }
  }

  private validateKnockoutStage(
    matchData: Partial<CreateMatchDto>,
    qualifyingStageId?: string | null,
    knockoutStageId?: string | null,
  ): void {
    if (matchData.matchDay !== null) {
      throw new BadRequestException(
        this.STAGE_VALIDATION_MESSAGES.KNOCKOUT_STAGE.MATCH_DAY,
      );
    }
    if (!matchData.matchType) {
      throw new BadRequestException(
        this.STAGE_VALIDATION_MESSAGES.KNOCKOUT_STAGE.MATCH_TYPE,
      );
    }
    if (qualifyingStageId !== undefined && qualifyingStageId !== null) {
      throw new BadRequestException(
        this.STAGE_VALIDATION_MESSAGES.KNOCKOUT_STAGE.QUALIFYING_STAGE_ID,
      );
    }
    if (!knockoutStageId) {
      throw new BadRequestException(
        this.STAGE_VALIDATION_MESSAGES.KNOCKOUT_STAGE.KNOCKOUT_STAGE_ID,
      );
    }
  }

  private validateStageSpecificFields(
    matchData: Partial<CreateMatchDto>,
    qualifyingStageId?: string | null,
    knockoutStageId?: string | null,
  ): void {
    if (!matchData.stage) {
      throw new BadRequestException(
        this.STAGE_VALIDATION_MESSAGES.INVALID_STAGE,
      );
    }

    const stageValidators: Record<string, () => void> = {
      qualifyingStage: () =>
        this.validateQualifyingStage(
          matchData,
          qualifyingStageId,
          knockoutStageId,
        ),
      groupStage: () =>
        this.validateGroupStage(matchData, qualifyingStageId, knockoutStageId),
      knockoutStage: () =>
        this.validateKnockoutStage(
          matchData,
          qualifyingStageId,
          knockoutStageId,
        ),
    };

    const validator = stageValidators[matchData.stage];
    if (!validator) {
      throw new BadRequestException(
        this.STAGE_VALIDATION_MESSAGES.INVALID_STAGE,
      );
    }

    validator();
  }

  private async fetchRequiredEntities(
    matchData: Partial<CreateMatchDto>,
    groupId?: string,
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

    const [tournament, homeTeam, awayTeam] = await Promise.all([
      this.tournamentService.findOne(matchData.tournamentId),
      this.tournamentTeamService.findOne(matchData.homeTeamId),
      this.tournamentTeamService.findOne(matchData.awayTeamId),
    ]);

    if (!tournament || !homeTeam || !awayTeam) {
      throw new BadRequestException('Tournament or teams not found');
    }

    let groupClassification: { groups: { group: any; teams: any }[] } | null =
      null;
    if (matchData.stage === 'groupStage') {
      if (!groupId) {
        throw new BadRequestException(
          'groupId is required for group stage matches',
        );
      }
      groupClassification =
        await this.groupClassificationService.findByTournamentIdAndGroupId(
          matchData.tournamentId,
          groupId,
        );
    }

    return [groupClassification, tournament, homeTeam, awayTeam] as const;
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
    if (!groupClassification) {
      return; // Skip validation if not a group stage match
    }

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

  private async validateTeamsInQualifyingStage(
    qualifyingStageId: string,
    homeTeamId: string,
    awayTeamId: string,
  ): Promise<void> {
    if (!qualifyingStageId) {
      throw new BadRequestException(
        'qualifyingStageId is required for qualifying stage matches',
      );
    }

    const qualifyingStage =
      await this.qualifyingStagesService.findOne(qualifyingStageId);

    const stageTeams = [
      qualifyingStage.firstTeam._id.toString(),
      qualifyingStage.secondTeam._id.toString(),
    ];

    const matchTeams = [homeTeamId, awayTeamId];

    // Check if both teams are in the qualifying stage (order doesn't matter)
    const teamsMatch = matchTeams.every((teamId) =>
      stageTeams.includes(teamId),
    );

    if (!teamsMatch) {
      throw new BadRequestException(
        'Home team and away team must match the teams in the qualifying stage',
      );
    }
  }

  private async validateTeamsInKnockoutStage(
    knockoutStageId: string,
    homeTeamId: string,
    awayTeamId: string,
  ): Promise<void> {
    if (!knockoutStageId) {
      throw new BadRequestException(
        'knockoutStageId is required for knockout stage matches',
      );
    }

    const knockoutStage =
      await this.knockoutStagesService.findOne(knockoutStageId);

    const stageTeams = [
      knockoutStage.firstTeam._id.toString(),
      knockoutStage.secondTeam._id.toString(),
    ];

    const matchTeams = [homeTeamId, awayTeamId];

    // Check if both teams are in the knockout stage (order doesn't matter)
    const teamsMatch = matchTeams.every((teamId) =>
      stageTeams.includes(teamId),
    );

    if (!teamsMatch) {
      throw new BadRequestException(
        'Home team and away team must match the teams in the knockout stage',
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
