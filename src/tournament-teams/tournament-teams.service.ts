import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateTournamentTeamsDto } from './dto/create-tournament-team.dto';
import { InjectModel } from '@nestjs/mongoose';
import { TournamentTeam } from './entities/tournament-team.entity';
import { Model, Types } from 'mongoose';
import { TournamentsService } from 'src/tournaments/tournaments.service';
import { TeamsService } from 'src/teams/teams.service';
import { FileManagementService } from 'src/teams/services/file-management.service';
import {
  GroupStageDrawService,
  GroupStageResult,
} from './services/group-stage-draw.service';
import {
  QualifyingStageDrawService,
  QualifyingStageResult,
} from './services/qualifying-stage-draw.service';
import { TOURNAMENT_CONSTANTS } from './constants/tournament.constants';

/**
 * Service for managing tournament teams relationships and group stage draws
 */
@Injectable()
export class TournamentTeamsService {
  constructor(
    @InjectModel(TournamentTeam.name)
    private readonly tournamentTeamModel: Model<TournamentTeam>,
    private readonly tournamentsService: TournamentsService,
    private readonly teamsService: TeamsService,
    private readonly fileManagementService: FileManagementService,
    private readonly groupStageDrawService: GroupStageDrawService,
    private readonly qualifyingStageDrawService: QualifyingStageDrawService,
  ) {}

  /**
   * Create tournament teams associations
   * @param createTournamentTeamsDto DTO containing tournament and teams data
   * @returns Created tournament teams
   */
  async create(createTournamentTeamsDto: CreateTournamentTeamsDto) {
    try {
      await this.validateTournamentExists(
        createTournamentTeamsDto.tournamentId,
      );
      await this.validateTeamsExist(createTournamentTeamsDto.teams);
      await this.validateTeamsNotInTournament(createTournamentTeamsDto);

      const tournamentTeams = this.mapToTournamentTeams(
        createTournamentTeamsDto,
      );
      return await this.tournamentTeamModel.insertMany(tournamentTeams);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.handleExceptions(error);
    }
  }

  private async validateTournamentExists(tournamentId: string): Promise<void> {
    await this.tournamentsService.findOne(tournamentId);
  }

  private async validateTeamsExist(
    teams: Array<{ teamId: string }>,
  ): Promise<void> {
    const teamIds = teams.map((team) => team.teamId);
    const existingTeams = await this.teamsService.findByIds(teamIds);

    if (existingTeams.length !== teams.length) {
      throw new BadRequestException(
        'One or more teams do not exist in the database',
      );
    }
  }

  private async validateTeamsNotInTournament(
    dto: CreateTournamentTeamsDto,
  ): Promise<void> {
    const existingTeams = await this.tournamentTeamModel.find({
      tournamentId: new Types.ObjectId(dto.tournamentId),
      teamId: {
        $in: dto.teams.map((team) => new Types.ObjectId(team.teamId)),
      },
    });

    if (existingTeams.length > 0) {
      throw new BadRequestException(
        'One or more teams already exist in the tournament',
      );
    }
  }

  private mapToTournamentTeams(dto: CreateTournamentTeamsDto) {
    return dto.teams.map((team) => ({
      tournamentId: new Types.ObjectId(dto.tournamentId),
      teamId: new Types.ObjectId(team.teamId),
      ranking: team.ranking,
      points: team.points,
      bombo: team.bombo,
      isCurrentChampion: team.isCurrentChampion,
      isFromQualifyingStage: team.isFromQualifyingStage,
      qualifyingEntryStage: team.qualifyingEntryStage,
    }));
  }

  async findAll() {
    return await this.buildBaseQuery()
      .find()
      .populate(this.getPopulateOptions())
      .exec();
  }

  async findOne(id: string) {
    this.validateObjectId(id);

    const tournamentTeam = await this.buildBaseQuery()
      .findById(id)
      .populate(this.getPopulateOptions())
      .exec();

    if (!tournamentTeam) {
      throw new BadRequestException(`Tournament team with id ${id} not found`);
    }

    return tournamentTeam;
  }

  /**
   * Find tournament teams by tournament ID with optional additional filters
   * @param id Tournament ID
   * @param additionalFilters Optional additional MongoDB filter criteria
   * @returns Array of tournament teams
   */
  async findByTournament(
    id: string,
    additionalFilters: Record<string, any> = {},
  ) {
    this.validateObjectId(id);

    // Build dynamic query - start with tournament ID and merge additional filters
    const query = {
      tournamentId: new Types.ObjectId(id),
      ...additionalFilters,
    };

    const tournamentTeams = await this.buildBaseQuery()
      .find(query)
      .populate(this.getPopulateOptions())
      .lean()
      .exec();

    if (!tournamentTeams || tournamentTeams.length === 0) {
      const filterDescription =
        Object.keys(additionalFilters).length > 0
          ? ` with filters: ${JSON.stringify(additionalFilters)}`
          : '';
      throw new BadRequestException(
        `No tournament teams found for tournament with id ${id}${filterDescription}`,
      );
    }

    return tournamentTeams.map((tournamentTeam) => {
      try {
        return this.formatTournamentTeamResponse(tournamentTeam);
      } catch (error) {
        console.warn('Failed to generate logo URL:', error);
        return {
          ...tournamentTeam,
          teamId: {
            ...tournamentTeam.teamId,
            logo: null,
          },
        };
      }
    });
  }

  /**
   * Soft delete a tournament team
   * @param id Tournament team ID
   * @returns Soft deleted tournament team
   */
  async softDelete(id: string) {
    this.validateObjectId(id);

    const tournamentTeam = await this.findOne(id);

    if (tournamentTeam.isParticipating === false) {
      throw new BadRequestException(
        `Tournament team with id ${id} already has been eliminated from the tournament`,
      );
    }

    tournamentTeam.isParticipating = false;
    await tournamentTeam.save();

    return tournamentTeam;
  }

  private buildBaseQuery() {
    return this.tournamentTeamModel;
  }

  private getPopulateOptions() {
    return [
      { path: 'tournamentId', select: 'name year' },
      { path: 'teamId', select: '-__v' },
    ];
  }

  private validateObjectId(id: string): void {
    if (id.length !== TOURNAMENT_CONSTANTS.OBJECT_ID_LENGTH) {
      throw new BadRequestException('Invalid ObjectId format');
    }
  }

  /**
   * Find tournament teams by their IDs
   * @param ids Array of tournament team IDs
   * @returns Array of tournament teams
   */
  async findByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    if (ids.some((id) => id.length !== TOURNAMENT_CONSTANTS.OBJECT_ID_LENGTH)) {
      throw new BadRequestException('Invalid ObjectId');
    }

    const tournamentTeams = await this.buildBaseQuery()
      .find({ _id: { $in: ids } })
      .populate(this.getPopulateOptions())
      .exec();

    return tournamentTeams;
  }

  /**
   * Generate a qualifying stage draw for a tournament
   * @param tournamentId The tournament ID
   * @returns Complete qualifying stage draw with phases 1, 2, and 3
   */
  async qualifyingStageDraw(
    tournamentId: string,
  ): Promise<QualifyingStageResult> {
    await this.tournamentsService.findOne(tournamentId);
    const tournamentTeams = await this.findByTournament(tournamentId, {
      isFromQualifyingStage: true,
    });
    const qualifyingTeams = tournamentTeams.map((tournamentTeam) => ({
      ...tournamentTeam.teamId,
      ranking: tournamentTeam.ranking,
      points: tournamentTeam.points,
      bombo: tournamentTeam.bombo,
      isCurrentChampion: tournamentTeam.isCurrentChampion,
      isFromQualifyingStage: tournamentTeam.isFromQualifyingStage,
      qualifyingEntryStage: tournamentTeam.qualifyingEntryStage,
    }));

    return this.qualifyingStageDrawService.generateDraw(qualifyingTeams);
  }

  /**
   * Generate a group stage draw for a tournament
   * @param tournamentId The tournament ID
   * @returns Group stage draw result with teams distributed in groups
   */
  async groupStageDraw(tournamentId: string): Promise<GroupStageResult> {
    await this.tournamentsService.findOne(tournamentId);
    const tournamentTeams = await this.findByTournament(tournamentId, {
      isParticipating: true,
    });
    const formattedTeams = tournamentTeams.map((tournamentTeam) => ({
      ...tournamentTeam.teamId,
      ranking: tournamentTeam.ranking,
      points: tournamentTeam.points,
      bombo: tournamentTeam.bombo,
      isCurrentChampion: tournamentTeam.isCurrentChampion,
      isFromQualifyingStage: tournamentTeam.isFromQualifyingStage,
      qualifyingEntryStage: tournamentTeam.qualifyingEntryStage,
    }));

    return this.groupStageDrawService.generateDraw(formattedTeams);
  }

  private formatTournamentTeamResponse(tournamentTeam: any): any {
    return {
      ...tournamentTeam,
      teamId: {
        ...tournamentTeam.teamId,
        logo: tournamentTeam.teamId?.logo
          ? this.fileManagementService.generateLogoUrl(
              tournamentTeam.teamId.logo,
            )
          : null,
      },
    };
  }

  private handleExceptions(error: any) {
    if (error.code === 11000) {
      const keyValueString = error.keyValue
        ? Object.entries(error.keyValue)
            .map(([key, value]) => `${key}: '${value}'`)
            .join(', ')
        : 'unknown duplicate key';

      throw new BadRequestException(
        `Tournament Team already exists in the database { ${keyValueString} }`,
      );
    }
    console.log(error);
    throw new InternalServerErrorException(`Check Server logs`);
  }
}
