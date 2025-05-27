import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CreateGroupClassificationsDto,
  UpdateGroupClassificationsDto,
} from './dto';
import { KNOCKOUT_CONSTANTS } from './constants/knockout.constants';
import { GroupClassification } from './entities/group-classification.entity';
import { AggregationHelper, KnockoutHelper } from './helpers';
import {
  DrawResult,
  GroupClassificationResult,
  GroupWithTeams,
  QualifiedTeams,
} from './interfaces/knockout.interface';
import { GroupsService } from 'src/groups/groups.service';
import { TournamentTeamsService } from 'src/tournament-teams/tournament-teams.service';

@Injectable()
export class GroupClassificationService {
  private readonly aggregationHelper: AggregationHelper;

  constructor(
    @InjectModel(GroupClassification.name)
    private readonly groupClassificationModel: Model<GroupClassification>,
    private readonly tournamentTeamService: TournamentTeamsService,
    private readonly groupService: GroupsService,
  ) {
    this.aggregationHelper = new AggregationHelper();
  }

  /**
   * Retrieves group classifications for a tournament, optionally filtered by group
   * @param tournamentId Tournament identifier
   * @param groupId Optional group identifier for filtering
   * @returns Group classifications with team standings
   */
  async findByTournamentIdAndGroupId(
    tournamentId: string,
    groupId?: string,
  ): Promise<GroupClassificationResult> {
    try {
      const pipeline = this.aggregationHelper.getGroupClassificationPipeline(
        tournamentId,
        groupId,
      );

      const groups: GroupWithTeams[] =
        await this.groupClassificationModel.aggregate(pipeline);

      if (groups.length === 0) {
        throw new NotFoundException('Group classification not found');
      }

      const reorderedGroups = this.sortGroupsAndTeams(groups);

      return { groups: reorderedGroups };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.handleExceptions(error);
    }
  }

  /**
   * Creates new group classifications for tournament teams
   * @param createGroupClassificationDto Data for creating group classifications
   * @returns Created group classifications
   */
  async create(createGroupClassificationDto: CreateGroupClassificationsDto) {
    try {
      const { groupId, tournamentTeamIds } = createGroupClassificationDto;

      await this.validateTournamentTeams(tournamentTeamIds);
      const group = await this.groupService.findOne(groupId);
      await this.validateUniqueGroupAssignments(tournamentTeamIds, group._id);

      const groupClassifications = tournamentTeamIds.map(
        (tournamentTeamId) => ({
          tournamentTeamId: new Types.ObjectId(tournamentTeamId),
          groupId: group._id,
        }),
      );

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

  /**
   * Updates group classifications with match results
   * @param updateGroupClassificationDto Data for updating classifications
   * @returns Updated group classifications
   */
  async update(updateGroupClassificationDto: UpdateGroupClassificationsDto) {
    try {
      const { groupId, classifications } = updateGroupClassificationDto;

      const tournamentTeamIds = classifications.map(
        (classification) => classification.tournamentTeamId,
      );

      await this.validateTournamentTeams(tournamentTeamIds);
      const group = await this.groupService.findOne(groupId);
      await this.validateExistingGroupAssignments(tournamentTeamIds, group._id);

      const updatePromises = classifications.map((classification) =>
        this.updateSingleClassification(classification, group._id),
      );

      return await Promise.all(updatePromises);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.handleExceptions(error);
    }
  }

  /**
   * Generates knockout phase matchups from group stage results
   * @param tournamentId Tournament identifier
   * @returns Draw result with matchups
   */
  async drawKnockoutMatchups(tournamentId: string): Promise<DrawResult> {
    try {
      const groupsData = await this.findByTournamentIdAndGroupId(tournamentId);

      if (!groupsData.groups || groupsData.groups.length === 0) {
        throw new NotFoundException(
          'No group classifications found for this tournament',
        );
      }

      KnockoutHelper.validateGroupsForKnockout(groupsData.groups);

      const { firstPlaceTeams, secondPlaceTeams } =
        KnockoutHelper.extractQualifiedTeams(groupsData.groups);

      KnockoutHelper.validateTeamBalance(firstPlaceTeams, secondPlaceTeams);

      const matchups = KnockoutHelper.createRandomKnockoutMatchups(
        firstPlaceTeams,
        secondPlaceTeams,
      );

      return {
        tournamentId,
        round: KNOCKOUT_CONSTANTS.ROUNDS.ROUND_OF_16,
        totalMatchups: matchups.length,
        matchups,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.handleExceptions(error);
    }
  }

  /**
   * Retrieves qualified teams from group stage
   * @param tournamentId Tournament identifier
   * @returns First and second place teams from each group
   */
  async getQualifiedTeams(tournamentId: string): Promise<QualifiedTeams> {
    const groupsData = await this.findByTournamentIdAndGroupId(tournamentId);
    return KnockoutHelper.extractQualifiedTeams(groupsData.groups);
  }

  /**
   * Sorts groups and teams according to tournament rules
   */
  private sortGroupsAndTeams(groups: GroupWithTeams[]): GroupWithTeams[] {
    return groups.map((group) => ({
      group: group.group,
      teams: KnockoutHelper.sortTeamsByRanking(group.teams),
    }));
  }

  /**
   * Validates that tournament teams exist
   */
  private async validateTournamentTeams(
    tournamentTeamIds: string[],
  ): Promise<void> {
    const tournamentTeams =
      await this.tournamentTeamService.findByIds(tournamentTeamIds);

    if (tournamentTeams.length !== tournamentTeamIds.length) {
      throw new BadRequestException(
        'One or more tournament teams do not exist in the database',
      );
    }
  }

  /**
   * Validates that teams are not already assigned to the group
   */
  private async validateUniqueGroupAssignments(
    tournamentTeamIds: string[],
    groupId: Types.ObjectId,
  ): Promise<void> {
    const existingGroupClassifications =
      await this.groupClassificationModel.find({
        tournamentTeamId: {
          $in: tournamentTeamIds.map((id) => new Types.ObjectId(id)),
        },
        groupId,
      });

    if (existingGroupClassifications.length > 0) {
      throw new BadRequestException(
        'One or more tournament teams already exist in the group',
      );
    }
  }

  /**
   * Validates that teams are assigned to the group
   */
  private async validateExistingGroupAssignments(
    tournamentTeamIds: string[],
    groupId: Types.ObjectId,
  ): Promise<void> {
    const existingGroupClassifications =
      await this.groupClassificationModel.find({
        tournamentTeamId: {
          $in: tournamentTeamIds.map((id) => new Types.ObjectId(id)),
        },
        groupId,
      });

    if (existingGroupClassifications.length !== tournamentTeamIds.length) {
      throw new BadRequestException(
        'One or more tournament teams are not assigned to this group',
      );
    }
  }

  /**
   * Updates a single classification with match results
   */
  private async updateSingleClassification(
    classification: any,
    groupId: Types.ObjectId,
  ) {
    const { tournamentTeamId, ...updateData } = classification;

    // First update with increments
    const updatedClassification =
      await this.groupClassificationModel.findOneAndUpdate(
        {
          tournamentTeamId: new Types.ObjectId(tournamentTeamId),
          groupId,
        },
        {
          $inc: {
            matchesPlayed: updateData.matchesPlayed,
            wins: updateData.wins,
            draws: updateData.draws,
            losses: updateData.losses,
            goalsFor: updateData.goalsFor,
            goalsAgainst: updateData.goalsAgainst,
            points: updateData.points,
          },
        },
        { new: true },
      );

    if (!updatedClassification) {
      throw new NotFoundException(
        `Group classification not found for tournament team ${tournamentTeamId}`,
      );
    }

    // Then update goal difference
    return this.groupClassificationModel.findByIdAndUpdate(
      updatedClassification._id,
      {
        $set: {
          goalDifference:
            updatedClassification.goalsFor - updatedClassification.goalsAgainst,
        },
      },
      { new: true },
    );
  }

  /**
   * Centralized error handling
   */
  private handleExceptions(error: any): never {
    if (error.code === 11000) {
      console.error('Duplicate key error:', error);
      const keyValueString = Object.entries(error.keyValue)
        .map(([key, value]) => `${key}: '${value}'`)
        .join(', ');

      throw new BadRequestException(
        `Group classification already exists in the database { ${keyValueString} }`,
      );
    }

    console.error('Unexpected error:', error);
    throw new InternalServerErrorException('Check server logs for details');
  }
}
