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
import {
  GroupStageDrawService,
  GroupStageResult,
} from './services/group-stage-draw.service';
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
    private readonly groupStageDrawService: GroupStageDrawService,
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

    const tournamentTeams = await this.buildBaseQuery()
      .find({ tournamentId: new Types.ObjectId(id) })
      .populate(this.getPopulateOptions())
      .exec();

    if (!tournamentTeams || tournamentTeams.length === 0) {
      throw new BadRequestException(
        `No tournament teams found for tournament with id ${id}`,
      );
    }

    return tournamentTeams;
  }

  private buildBaseQuery() {
    return this.tournamentTeamModel;
  }

  private getPopulateOptions() {
    return [
      { path: 'tournamentId', select: 'name year' },
      {
        path: 'teamId',
        select: '-isParticipating',
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
   * Generate a group stage draw for a tournament
   * @param tournamentId The tournament ID
   * @returns Group stage draw result with teams distributed in groups
   */
  async groupStageDraw(tournamentId: string): Promise<GroupStageResult> {
    await this.tournamentsService.findOne(tournamentId);
    const tournamentTeams = await this.findByTournament(tournamentId);
    return this.groupStageDrawService.generateDraw(tournamentTeams);
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
