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
   * Find tournament teams by tournament ID
   * @param id Tournament ID
   * @returns Array of tournament teams
   */
  async findByTournament(id: string) {
    this.validateObjectId(id);

    const tournamentTeams = await this.tournamentTeamModel
      .aggregate([
        {
          $match: { tournamentId: new Types.ObjectId(id) },
        },
        {
          $lookup: {
            from: 'teams',
            localField: 'teamId',
            foreignField: '_id',
            as: 'teamId',
            pipeline: [
              {
                $match: { isParticipating: true },
              },
            ],
          },
        },
        {
          $unwind: '$teamId',
        },
        {
          $lookup: {
            from: 'tournaments',
            localField: 'tournamentId',
            foreignField: '_id',
            as: 'tournamentId',
            pipeline: [
              {
                $project: { name: 1, year: 1 },
              },
            ],
          },
        },
        {
          $unwind: '$tournamentId',
        },
      ])
      .exec();

    if (!tournamentTeams || tournamentTeams.length === 0) {
      throw new BadRequestException(
        `No tournament teams found for tournament with id ${id}`,
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

  private buildBaseQuery() {
    return this.tournamentTeamModel;
  }

  private getPopulateOptions() {
    return [
      { path: 'tournamentId', select: 'name year' },
      {
        path: 'teamId',
        match: { isParticipating: true },
        populate: { path: 'bombo', select: 'name' },
      },
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
    const qualifyingTeams = await this.teamsService.findAll({
      isFromQualifyingStage: true,
    });
    return this.qualifyingStageDrawService.generateDraw(qualifyingTeams);
  }

  /**
   * Generate a group stage draw for a tournament
   * @param tournamentId The tournament ID
   * @returns Group stage draw result with teams distributed in groups
   */
  async groupStageDraw(tournamentId: string): Promise<GroupStageResult> {
    await this.tournamentsService.findOne(tournamentId);
    const tournamentTeams = await this.findByTournament(tournamentId);
    return this.groupStageDrawService.generateDraw(tournamentTeams);
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
      console.log(error);
      const keyValueString = Object.entries(error.keyValue)
        .map(([key, value]) => `${key}: '${value}'`)
        .join(', ');

      throw new BadRequestException(
        `Tournament Team already exists in the database { ${keyValueString} }`,
      );
    }
    console.log(error);
    throw new InternalServerErrorException(`Check Server logs`);
  }
}
