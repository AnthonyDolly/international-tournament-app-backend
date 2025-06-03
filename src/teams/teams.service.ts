import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Team, TeamDocument } from './entities/team.entity';
import { CreateTeamDto, UpdateTeamDto, QueryTeamsDto } from './dto';
import { FileManagementService } from './services/file-management.service';
import {
  TEAM_CONSTANTS,
  SouthAmericanCountry,
  BomboType,
} from './constants/team.constants';
import { TeamResponse, PopulatedTeamResponse } from './types/team.types';

/**
 * Service for managing teams and their operations
 */
@Injectable()
export class TeamsService {
  constructor(
    @InjectModel(Team.name) private readonly teamModel: Model<TeamDocument>,
    private readonly fileManagementService: FileManagementService,
  ) {}

  /**
   * Creates a new team
   * @param createTeamDto Team data to create
   * @returns Created team
   */
  async create(createTeamDto: CreateTeamDto): Promise<TeamResponse> {
    try {
      const team = await this.teamModel.create(createTeamDto);
      return this.formatTeamResponse(team);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.handleExceptions(error);
    }
  }

  /**
   * Uploads a logo for a team
   * @param id Team ID
   * @param file Logo file
   * @returns Updated team with logo URL
   */
  async uploadLogo(
    id: string,
    file: Express.Multer.File,
  ): Promise<TeamResponse> {
    try {
      this.validateObjectId(id);
      this.fileManagementService.validateImageFile(file);

      const team = await this.findTeamById(id);

      // Delete old logo if exists
      if (team.logo) {
        this.fileManagementService.deleteOldLogo(team.logo);
      }

      // Update team with new logo
      team.logo = file.filename;
      await team.save();

      return this.formatTeamResponse(team);
    } catch (error) {
      this.fileManagementService.cleanupUploadedFile(file);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.handleExceptions(error);
    }
  }

  /**
   * Retrieves teams with filtering and sorting
   * @param queryDto Query parameters DTO
   * @returns Array of teams
   */
  async findAll(queryDto: QueryTeamsDto = {}): Promise<TeamResponse[]> {
    const {
      country,
      bombo,
      isCurrentChampion,
      isFromQualifyingStage,
      includeInactive = false,
      sortBy = 'ranking',
      sortOrder = 'asc',
    } = queryDto;

    const filters = {
      ...(country && { country: country as SouthAmericanCountry }),
      ...(bombo && { bombo: bombo as BomboType }),
      ...(isCurrentChampion !== undefined && { isCurrentChampion }),
      ...(isFromQualifyingStage !== undefined && { isFromQualifyingStage }),
    };

    const query = this.buildQuery(filters, includeInactive);

    let teams ;

    if (sortBy === 'ranking') {
      teams = await this.findAllWithRankingSort(query.getFilter(), sortOrder);
    } else {
      const sortOptions = this.buildSortOptions(sortBy, sortOrder);
      teams = await query.sort(sortOptions).exec();
    }

    return teams.map((team) => this.formatTeamResponse(team));
  }

  /**
   * Retrieves a team by ID with populated data
   * @param id Team ID
   * @returns Team with populated bombo data
   */
  async findOne(id: string): Promise<PopulatedTeamResponse> {
    this.validateObjectId(id);

    const team = await this.teamModel
      .findById(id)
      .populate({ path: 'bombo', select: 'name' })
      .exec();

    if (!team) {
      throw new NotFoundException(`Team with id ${id} not found`);
    }

    return this.formatPopulatedTeamResponse(team);
  }

  /**
   * Updates a team
   * @param id Team ID
   * @param updateTeamDto Updated team data
   * @returns Updated team
   */
  async update(
    id: string,
    updateTeamDto: UpdateTeamDto,
  ): Promise<TeamResponse> {
    try {
      this.validateObjectId(id);

      const updatedTeam = await this.teamModel.findByIdAndUpdate(
        id,
        { $set: updateTeamDto },
        { new: true, runValidators: true },
      );

      if (!updatedTeam) {
        throw new NotFoundException(`Team with id ${id} not found`);
      }

      return this.formatTeamResponse(updatedTeam);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.handleExceptions(error);
    }
  }

  /**
   * Finds teams by their IDs
   * @param ids Array of team IDs
   * @returns Array of teams
   */
  async findByIds(ids: string[]): Promise<TeamResponse[]> {
    if (ids.length === 0) {
      return [];
    }

    this.validateObjectIds(ids);

    const teams = await this.teamModel.find({ _id: { $in: ids } }).exec();

    return teams.map((team) => this.formatTeamResponse(team));
  }

  /**
   * Deletes a team (soft delete by setting isParticipating to false)
   * @param id Team ID
   * @returns Success message
   */
  async remove(id: string): Promise<{ message: string }> {
    this.validateObjectId(id);

    const team = await this.teamModel.findByIdAndUpdate(
      id,
      { $set: { isParticipating: false } },
      { new: true },
    );

    if (!team) {
      throw new NotFoundException(`Team with id ${id} not found`);
    }

    return { message: `Team ${team.name} has been deactivated successfully` };
  }

  // Private helper methods

  private async findTeamById(id: string): Promise<TeamDocument> {
    const team = await this.teamModel.findById(id);
    if (!team) {
      throw new NotFoundException(`Team with id ${id} not found`);
    }
    return team;
  }

  private validateObjectId(id: string): void {
    if (
      id.length !== TEAM_CONSTANTS.OBJECT_ID_LENGTH ||
      !Types.ObjectId.isValid(id)
    ) {
      throw new BadRequestException('Invalid ObjectId format');
    }
  }

  private validateObjectIds(ids: string[]): void {
    const invalidIds = ids.filter(
      (id) =>
        id.length !== TEAM_CONSTANTS.OBJECT_ID_LENGTH ||
        !Types.ObjectId.isValid(id),
    );

    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Invalid ObjectId format for IDs: ${invalidIds.join(', ')}`,
      );
    }
  }

  private buildQuery(filters: any, includeInactive: boolean) {
    const query: any = {};

    if (!includeInactive) {
      query.isParticipating = true;
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        query[key] = value;
      }
    });

    return this.teamModel.find(query);
  }

  private async findAllWithRankingSort(
    filters: any,
    sortOrder: string,
  ): Promise<TeamDocument[]> {
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const nullReplacement = 999999;

    return await this.teamModel
      .aggregate([
        {
          $match: filters,
        },
        {
          $addFields: {
            sortRanking: {
              $ifNull: ['$ranking', nullReplacement],
            },
          },
        },
        {
          $sort: {
            sortRanking: sortDirection,
          },
        },
        {
          $unset: 'sortRanking',
        },
      ])
      .exec();
  }

  private buildSortOptions(
    sortBy: string,
    sortOrder: string,
  ): Record<string, 1 | -1> {
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    return { [sortBy]: sortDirection };
  }

  private formatTeamResponse(team: TeamDocument | any): TeamResponse {
    const teamObject =
      typeof team.toObject === 'function' ? team.toObject() : team;

    return {
      ...teamObject,
      logo: this.fileManagementService.generateLogoUrl(teamObject.logo),
    } as TeamResponse;
  }

  private formatPopulatedTeamResponse(team: any): PopulatedTeamResponse {
    return {
      ...team.toObject(),
      logo: this.fileManagementService.generateLogoUrl(team.logo),
    } as PopulatedTeamResponse;
  }

  private handleExceptions(error: any): never {
    if (error.code === 11000) {
      console.error('Duplicate key error:', error);
      const keyValueString = Object.entries(error.keyValue)
        .map(([key, value]) => `${key}: '${value}'`)
        .join(', ');

      throw new BadRequestException(
        `Team already exists in the database { ${keyValueString} }`,
      );
    }

    console.error('Unexpected error:', error);
    throw new InternalServerErrorException('Check server logs for details');
  }
}
