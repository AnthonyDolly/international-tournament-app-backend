import { UpdateQualifyingStageDto } from 'src/qualifying-stages/dto/update-qualifying-stage.dto';
import { UpdateKnockoutStageDto } from 'src/knockout-stages/dto/update-knockout-stage.dto';
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

      // Validate knockout stage match type rules
      if (matchData.stage === 'knockoutStage' && knockoutStageId) {
        await this.validateKnockoutStageMatchType(
          knockoutStageId,
          matchData.matchType,
        );
      }

      // Check for existing qualifying stage matches with same leg
      if (
        matchData.stage === 'qualifyingStage' &&
        qualifyingStageId &&
        matchData.matchType
      ) {
        const existingMatch = await this.matchModel
          .findOne({
            qualifyingStageId: new Types.ObjectId(qualifyingStageId),
            matchType: matchData.matchType,
          })
          .lean();

        if (existingMatch) {
          throw new BadRequestException(
            `A match with matchType ${matchData.matchType} already exists for this qualifying stage`,
          );
        }

        // If trying to create a second leg match, verify first leg exists
        if (matchData.matchType === 'secondLeg') {
          const firstLegMatch = await this.matchModel
            .findOne({
              qualifyingStageId: new Types.ObjectId(qualifyingStageId),
              matchType: 'firstLeg',
            })
            .lean();

          if (!firstLegMatch) {
            throw new BadRequestException(
              'Cannot create second leg match before first leg match exists',
            );
          }

          // Validate that home and away teams are swapped from first leg
          const firstLegHomeTeam = firstLegMatch.homeTeamId.toString();
          const firstLegAwayTeam = firstLegMatch.awayTeamId.toString();
          const secondLegHomeTeam = matchData.homeTeamId;
          const secondLegAwayTeam = matchData.awayTeamId;

          if (
            firstLegHomeTeam !== secondLegAwayTeam ||
            firstLegAwayTeam !== secondLegHomeTeam
          ) {
            throw new BadRequestException(
              'In second leg matches, home and away teams must be swapped from the first leg',
            );
          }
        }
      }

      // Check for existing knockout stage matches with same leg
      if (
        matchData.stage === 'knockoutStage' &&
        knockoutStageId &&
        matchData.matchType
      ) {
        const existingMatch = await this.matchModel
          .findOne({
            knockoutStageId: new Types.ObjectId(knockoutStageId),
            matchType: matchData.matchType,
          })
          .lean();

        if (existingMatch) {
          throw new BadRequestException(
            `A match with matchType ${matchData.matchType} already exists for this knockout stage`,
          );
        }

        // If trying to create a second leg match, verify first leg exists
        if (matchData.matchType === 'secondLeg') {
          const firstLegMatch = await this.matchModel
            .findOne({
              knockoutStageId: new Types.ObjectId(knockoutStageId),
              matchType: 'firstLeg',
            })
            .lean();

          if (!firstLegMatch) {
            throw new BadRequestException(
              'Cannot create second leg match before first leg match exists',
            );
          }

          // Validate that home and away teams are swapped from first leg
          const firstLegHomeTeam = firstLegMatch.homeTeamId.toString();
          const firstLegAwayTeam = firstLegMatch.awayTeamId.toString();
          const secondLegHomeTeam = matchData.homeTeamId;
          const secondLegAwayTeam = matchData.awayTeamId;

          if (
            firstLegHomeTeam !== secondLegAwayTeam ||
            firstLegAwayTeam !== secondLegHomeTeam
          ) {
            throw new BadRequestException(
              'In second leg matches, home and away teams must be swapped from the first leg',
            );
          }
        }
      }

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
    const match = await this.findOne(id);

    // Check if match can be updated
    if (match.status === 'finished') {
      throw new BadRequestException(
        'Cannot update a finished match. Create a new one instead.',
      );
    }

    // Perform qualifying stage validation BEFORE updating the match
    let qualifyingStageUpdateData: UpdateQualifyingStageDto | null = null;
    let qualifyingStageId: string | null = null;
    let qualifyingEliminatedTeamId: string | null = null;

    // Perform knockout stage validation BEFORE updating the match
    let knockoutStageUpdateData: UpdateKnockoutStageDto | null = null;
    let knockoutStageId: string | null = null;
    let knockoutEliminatedTeamId: string | null = null;

    // Get the raw match data to access qualifyingStageId
    const rawMatch = await this.matchModel.findById(id).lean();

    if (
      match.stage === 'qualifyingStage' &&
      match.status === 'pending' &&
      updateMatchDto.status === 'finished' &&
      updateMatchDto.homeGoals !== null &&
      updateMatchDto.awayGoals !== null &&
      rawMatch?.qualifyingStageId
    ) {
      qualifyingStageId = rawMatch.qualifyingStageId.toString();
      const qualifyingStage =
        await this.qualifyingStagesService.findOne(qualifyingStageId);

      // Check if the leg has already been played
      if (
        (match.matchType === 'firstLeg' && qualifyingStage.firstLegPlayed) ||
        (match.matchType === 'secondLeg' && qualifyingStage.secondLegPlayed)
      ) {
        throw new BadRequestException(
          `This ${match.matchType} has already been played for this qualifying stage`,
        );
      }

      // Determine which team is first and which is second
      const isHomeTeamFirst =
        match.homeTeam._id.toString() ===
        qualifyingStage.firstTeam._id.toString();

      // Update aggregate goals based on which team is first/second
      const firstTeamGoals = isHomeTeamFirst
        ? updateMatchDto.homeGoals
        : updateMatchDto.awayGoals;
      const secondTeamGoals = isHomeTeamFirst
        ? updateMatchDto.awayGoals
        : updateMatchDto.homeGoals;

      // Get existing aggregate goals
      const firstTeamAggregateGoals =
        (qualifyingStage.firstTeamAggregateGoals || 0) + firstTeamGoals;
      const secondTeamAggregateGoals =
        (qualifyingStage.secondTeamAggregateGoals || 0) + secondTeamGoals;

      // Prepare update data with required fields
      qualifyingStageUpdateData = {
        firstTeamAggregateGoals,
        secondTeamAggregateGoals,
        winnerTeamId: null as unknown as string, // This will be updated if it's a second leg match
        firstLegPlayed:
          match.matchType === 'firstLeg'
            ? true
            : qualifyingStage.firstLegPlayed,
        secondLegPlayed:
          match.matchType === 'secondLeg'
            ? true
            : qualifyingStage.secondLegPlayed,
      };

      // Determine winner if it's the second leg
      if (match.matchType === 'secondLeg') {
        
        if (firstTeamAggregateGoals > secondTeamAggregateGoals) {
          qualifyingStageUpdateData.winnerTeamId =
            qualifyingStage.firstTeam._id.toString();
          qualifyingEliminatedTeamId = qualifyingStage.secondTeam._id.toString();
        } else if (secondTeamAggregateGoals > firstTeamAggregateGoals) {
          qualifyingStageUpdateData.winnerTeamId =
            qualifyingStage.secondTeam._id.toString();
          qualifyingEliminatedTeamId = qualifyingStage.firstTeam._id.toString();
        } else {
          // Handle aggregate draw with penalties
          if (
            updateMatchDto.firstTeamPenaltyGoals !== undefined &&
            updateMatchDto.secondTeamPenaltyGoals !== undefined
          ) {
            // Determine which team gets which penalty goals based on home/away positions
            const isHomeTeamFirst =
              match.homeTeam._id.toString() ===
              qualifyingStage.firstTeam._id.toString();

            const firstTeamPenaltyGoals = isHomeTeamFirst
              ? updateMatchDto.firstTeamPenaltyGoals
              : updateMatchDto.secondTeamPenaltyGoals;
            const secondTeamPenaltyGoals = isHomeTeamFirst
              ? updateMatchDto.secondTeamPenaltyGoals
              : updateMatchDto.firstTeamPenaltyGoals;

            // Add penalty data to update
            qualifyingStageUpdateData.penaltiesPlayed = true;
            qualifyingStageUpdateData.firstTeamPenaltyGoals =
              firstTeamPenaltyGoals;
            qualifyingStageUpdateData.secondTeamPenaltyGoals =
              secondTeamPenaltyGoals;

            // Determine winner based on penalty goals
            if (firstTeamPenaltyGoals > secondTeamPenaltyGoals) {
              qualifyingStageUpdateData.winnerTeamId =
                qualifyingStage.firstTeam._id.toString();
              qualifyingEliminatedTeamId = qualifyingStage.secondTeam._id.toString();
            } else if (secondTeamPenaltyGoals > firstTeamPenaltyGoals) {
              qualifyingStageUpdateData.winnerTeamId =
                qualifyingStage.secondTeam._id.toString();
              qualifyingEliminatedTeamId = qualifyingStage.firstTeam._id.toString();
            } else {
              throw new BadRequestException(
                'Penalty shootout cannot end in a draw. One team must win.',
              );
            }
          } else {
            throw new BadRequestException(
              'Aggregate draw detected. Penalty goals (firstTeamPenaltyGoals and secondTeamPenaltyGoals) are required to determine the winner.',
            );
          }
        }
      }
    } else if (
      match.stage === 'knockoutStage' &&
      match.status === 'pending' &&
      updateMatchDto.status === 'finished' &&
      updateMatchDto.homeGoals !== null &&
      updateMatchDto.awayGoals !== null &&
      rawMatch?.knockoutStageId
    ) {
      knockoutStageId = rawMatch.knockoutStageId.toString();
      const knockoutStage =
        await this.knockoutStagesService.findOne(knockoutStageId);

      // Handle single match (final) logic
      if (knockoutStage.isSingleMatch && match.matchType === 'singleMatch') {
        // Check if the single match has already been completed
        if (knockoutStage.isCompleted) {
          throw new BadRequestException(
            'This final match has already been completed',
          );
        }

        // Determine which team is first and which is second
        const isHomeTeamFirst =
          match.homeTeam._id.toString() ===
          knockoutStage.firstTeam._id.toString();

        const firstTeamGoals = isHomeTeamFirst
          ? updateMatchDto.homeGoals
          : updateMatchDto.awayGoals;
        const secondTeamGoals = isHomeTeamFirst
          ? updateMatchDto.awayGoals
          : updateMatchDto.homeGoals;

        // Prepare update data for single match
        knockoutStageUpdateData = {
          firstTeamGoals,
          secondTeamGoals,
          isCompleted: true,
        };

        // Determine winner
        if (firstTeamGoals > secondTeamGoals) {
          knockoutStageUpdateData.winnerTeamId =
            knockoutStage.firstTeam._id.toString();
        } else if (secondTeamGoals > firstTeamGoals) {
          knockoutStageUpdateData.winnerTeamId =
            knockoutStage.secondTeam._id.toString();
        } else {
          // Handle draw with penalties
          if (
            updateMatchDto.firstTeamPenaltyGoals !== undefined &&
            updateMatchDto.secondTeamPenaltyGoals !== undefined
          ) {
            const firstTeamPenaltyGoals = isHomeTeamFirst
              ? updateMatchDto.firstTeamPenaltyGoals
              : updateMatchDto.secondTeamPenaltyGoals;
            const secondTeamPenaltyGoals = isHomeTeamFirst
              ? updateMatchDto.secondTeamPenaltyGoals
              : updateMatchDto.firstTeamPenaltyGoals;

            knockoutStageUpdateData.penaltiesPlayed = true;
            knockoutStageUpdateData.firstTeamPenaltyGoals =
              firstTeamPenaltyGoals;
            knockoutStageUpdateData.secondTeamPenaltyGoals =
              secondTeamPenaltyGoals;

            if (firstTeamPenaltyGoals > secondTeamPenaltyGoals) {
              knockoutStageUpdateData.winnerTeamId =
                knockoutStage.firstTeam._id.toString();
            } else if (secondTeamPenaltyGoals > firstTeamPenaltyGoals) {
              knockoutStageUpdateData.winnerTeamId =
                knockoutStage.secondTeam._id.toString();
            } else {
              throw new BadRequestException(
                'Penalty shootout cannot end in a draw. One team must win.',
              );
            }
          } else {
            throw new BadRequestException(
              'Draw detected in final. Penalty goals (firstTeamPenaltyGoals and secondTeamPenaltyGoals) are required to determine the winner.',
            );
          }
        }
      } else if (!knockoutStage.isSingleMatch) {
        // Handle two-legged match logic

        // Check if the leg has already been played
        if (
          (match.matchType === 'firstLeg' && knockoutStage.firstLegPlayed) ||
          (match.matchType === 'secondLeg' && knockoutStage.secondLegPlayed)
        ) {
          throw new BadRequestException(
            `This ${match.matchType} has already been played for this knockout stage`,
          );
        }

        // Determine which team is first and which is second
        const isHomeTeamFirst =
          match.homeTeam._id.toString() ===
          knockoutStage.firstTeam._id.toString();

        // Update aggregate goals based on which team is first/second
        const firstTeamGoals = isHomeTeamFirst
          ? updateMatchDto.homeGoals
          : updateMatchDto.awayGoals;
        const secondTeamGoals = isHomeTeamFirst
          ? updateMatchDto.awayGoals
          : updateMatchDto.homeGoals;

        // Get existing aggregate goals
        const firstTeamAggregateGoals =
          (knockoutStage.firstTeamAggregateGoals || 0) + firstTeamGoals;
        const secondTeamAggregateGoals =
          (knockoutStage.secondTeamAggregateGoals || 0) + secondTeamGoals;

        // Prepare update data with required fields
        knockoutStageUpdateData = {
          firstTeamAggregateGoals,
          secondTeamAggregateGoals,
          firstLegPlayed:
            match.matchType === 'firstLeg'
              ? true
              : knockoutStage.firstLegPlayed,
          secondLegPlayed:
            match.matchType === 'secondLeg'
              ? true
              : knockoutStage.secondLegPlayed,
        };

        // Determine winner if it's the second leg
        if (match.matchType === 'secondLeg') {
          // Mark the knockout stage as completed when second leg finishes
          knockoutStageUpdateData.isCompleted = true;

          if (firstTeamAggregateGoals > secondTeamAggregateGoals) {
            knockoutStageUpdateData.winnerTeamId =
              knockoutStage.firstTeam._id.toString();
          } else if (secondTeamAggregateGoals > firstTeamAggregateGoals) {
            knockoutStageUpdateData.winnerTeamId =
              knockoutStage.secondTeam._id.toString();
          } else {
            // Handle aggregate draw with penalties
            if (
              updateMatchDto.firstTeamPenaltyGoals !== undefined &&
              updateMatchDto.secondTeamPenaltyGoals !== undefined
            ) {
              // Determine which team gets which penalty goals based on home/away positions
              const isHomeTeamFirst =
                match.homeTeam._id.toString() ===
                knockoutStage.firstTeam._id.toString();

              const firstTeamPenaltyGoals = isHomeTeamFirst
                ? updateMatchDto.firstTeamPenaltyGoals
                : updateMatchDto.secondTeamPenaltyGoals;
              const secondTeamPenaltyGoals = isHomeTeamFirst
                ? updateMatchDto.secondTeamPenaltyGoals
                : updateMatchDto.firstTeamPenaltyGoals;

              // Add penalty data to update
              knockoutStageUpdateData.penaltiesPlayed = true;
              knockoutStageUpdateData.firstTeamPenaltyGoals =
                firstTeamPenaltyGoals;
              knockoutStageUpdateData.secondTeamPenaltyGoals =
                secondTeamPenaltyGoals;

              // Determine winner based on penalty goals
              if (firstTeamPenaltyGoals > secondTeamPenaltyGoals) {
                knockoutStageUpdateData.winnerTeamId =
                  knockoutStage.firstTeam._id.toString();
              } else if (secondTeamPenaltyGoals > firstTeamPenaltyGoals) {
                knockoutStageUpdateData.winnerTeamId =
                  knockoutStage.secondTeam._id.toString();
              } else {
                throw new BadRequestException(
                  'Penalty shootout cannot end in a draw. One team must win.',
                );
              }
            } else {
              throw new BadRequestException(
                'Aggregate draw detected. Penalty goals (firstTeamPenaltyGoals and secondTeamPenaltyGoals) are required to determine the winner.',
              );
            }
          }
        }
      } else {
        throw new BadRequestException(
          'Match type and knockout stage configuration mismatch. Single matches should have matchType "singleMatch".',
        );
      }
    }

    // Now update the match in the database (only if validation passed)
    const updatedMatch = await this.matchModel
      .findByIdAndUpdate(
        id,
        {
          ...updateMatchDto,
        },
        { new: true },
      )
      .lean();

    if (!updatedMatch) {
      throw new NotFoundException(`Match with ID ${id} not found`);
    }

    // Update qualifying stage if validation data was prepared
    if (qualifyingStageUpdateData && qualifyingStageId) {
      await this.qualifyingStagesService.update(
        qualifyingStageId,
        qualifyingStageUpdateData,
      );
    }

    // Update knockout stage if validation data was prepared
    if (knockoutStageUpdateData && knockoutStageId) {
      await this.knockoutStagesService.update(
        knockoutStageId,
        knockoutStageUpdateData,
      );
    }

    // Mark eliminated teams as not participating
    if (qualifyingEliminatedTeamId) {
      await this.tournamentTeamService.softDelete(qualifyingEliminatedTeamId);
    }

    if (knockoutEliminatedTeamId) {
      await this.tournamentTeamService.softDelete(knockoutEliminatedTeamId);
    }

    // Update group classification if it's a group stage match changing from pending to finished
    if (
      match.stage === 'groupStage' &&
      match.status === 'pending' &&
      updatedMatch.status === 'finished' &&
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
    if (matchData.matchDay !== null && matchData.matchDay !== undefined) {
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

  private async validateKnockoutStageMatchType(
    knockoutStageId: string,
    matchType?: string,
  ): Promise<void> {
    if (!knockoutStageId || !matchType) {
      return;
    }

    const knockoutStage =
      await this.knockoutStagesService.findOne(knockoutStageId);

    // Only 'final' knockout stages can have 'singleMatch' type
    if (
      matchType === 'singleMatch' &&
      knockoutStage.knockoutStage !== 'final'
    ) {
      throw new BadRequestException(
        `Match type 'singleMatch' is only allowed for 'final' knockout stage. Current stage: '${knockoutStage.knockoutStage}'`,
      );
    }

    // 'final' knockout stages can ONLY have 'singleMatch' type
    if (
      knockoutStage.knockoutStage === 'final' &&
      matchType !== 'singleMatch'
    ) {
      throw new BadRequestException(
        `Match type for 'final' knockout stage can only be 'singleMatch'. Provided type: '${matchType}'`,
      );
    }
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
