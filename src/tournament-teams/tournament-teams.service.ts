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

class Equipo {
  name: string;
  country: string;
  bombo: number;
  isCurrentChampion: boolean;
  isFromQualifiers: boolean;
  logo: string;
  originalId: string;

  constructor(
    name: string,
    country: string,
    bombo: number,
    isCurrentChampion: boolean = false,
    isFromQualifiers: boolean = false,
    logo: string,
    originalId: string,
  ) {
    this.name = name;
    this.country = country;
    this.bombo = bombo;
    this.isCurrentChampion = isCurrentChampion;
    this.isFromQualifiers = isFromQualifiers;
    this.logo = logo;
    this.originalId = originalId;
  }

  toString(): string {
    return `${this.name} (${this.country})`;
  }
}

@Injectable()
export class TournamentTeamsService {
  constructor(
    @InjectModel(TournamentTeam.name)
    private readonly tournamentTeamModel: Model<TournamentTeam>,
    private readonly tournamentsService: TournamentsService,
    private readonly teamsService: TeamsService,
  ) {}

  async create(createTournamentTeamsDto: CreateTournamentTeamsDto) {
    try {
      await this.tournamentsService.findOne(
        createTournamentTeamsDto.tournamentId,
      );

      const teams = await this.teamsService.findByIds(
        createTournamentTeamsDto.teams.map((team) => team.teamId),
      );

      if (teams.length !== createTournamentTeamsDto.teams.length) {
        throw new BadRequestException(
          'One or more teams do not exist in the database',
        );
      }

      const existingTeams = await this.tournamentTeamModel.find({
        tournamentId: new Types.ObjectId(createTournamentTeamsDto.tournamentId),
        teamId: {
          $in: createTournamentTeamsDto.teams.map(
            (team) => new Types.ObjectId(team.teamId),
          ),
        },
      });

      if (existingTeams && existingTeams.length > 0) {
        throw new BadRequestException(
          'One or more teams already exist in the tournament',
        );
      }

      const tournamentTeams = createTournamentTeamsDto.teams.map((team) => ({
        tournamentId: new Types.ObjectId(createTournamentTeamsDto.tournamentId),
        teamId: new Types.ObjectId(team.teamId),
      }));

      return await this.tournamentTeamModel.insertMany(tournamentTeams);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.handleExceptions(error);
    }
  }

  async findAll() {
    return await this.tournamentTeamModel
      .find()
      .populate({ path: 'tournamentId', select: 'name year' })
      .populate({
        path: 'teamId',
        select: '-isParticipating',
        populate: { path: 'bombo', select: 'name' },
      })
      .exec();
  }

  async findOne(id: string) {
    const tournamentTeam = await this.tournamentTeamModel
      .findById(id)
      .populate({ path: 'tournamentId', select: 'name year' })
      .populate({
        path: 'teamId',
        select: '-isParticipating',
        populate: { path: 'bombo', select: 'name' },
      })
      .exec();

    if (!tournamentTeam) {
      throw new BadRequestException(`tournamentTeam with id ${id} not found`);
    }

    return tournamentTeam;
  }

  async findByTournament(id: string) {
    const tournamentTeam = await this.tournamentTeamModel
      .find({ tournamentId: new Types.ObjectId(id) })
      .populate({ path: 'tournamentId', select: 'name year' })
      .populate({
        path: 'teamId',
        select: '-isParticipating',
        populate: { path: 'bombo', select: 'name' },
      });

    if (!tournamentTeam || tournamentTeam.length === 0) {
      throw new BadRequestException(
        `No tournamentTeams found for tournament with id ${id}`,
      );
    }

    return tournamentTeam;
  }

  async findByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    if (ids.some((id) => id.length !== 24)) {
      throw new BadRequestException('Invalid ObjectId');
    }

    const tournamentTeams = await this.tournamentTeamModel.find({
      _id: { $in: ids },
    });

    return tournamentTeams;
  }

  async groupStageDraw(tournamentId: string) {
    await this.tournamentsService.findOne(tournamentId);

    const tournamentTeams = await this.findByTournament(tournamentId);

    if (tournamentTeams.length !== 32) {
      throw new BadRequestException(
        'tournament must have exactly 32 teams for the group stage draw',
      );
    }

    // Convertir los equipos al formato necesario para el algoritmo
    const equipos: Equipo[] = tournamentTeams.map((teamEntry) => {
      const teamData = teamEntry.teamId as unknown as Equipo;
      return new Equipo(
        teamData.name,
        teamData.country,
        teamData.bombo,
        teamData.isCurrentChampion || false,
        teamData.isFromQualifiers || false,
        teamData.logo,
        teamEntry._id.toString(),
      );
    });

    // Realizar el sorteo
    const grupos = this.realizarSorteo(equipos);

    console.log(grupos?.map((g) => g.map((e) => e.toString())));

    if (!grupos) {
      throw new BadRequestException(
        'Could not generate a valid group stage draw',
      );
    }

    // Transformar el resultado a un formato apropiado para la respuesta API
    const result = grupos.map((grupo, index) => {
      return {
        group: String.fromCharCode(65 + index), // Convertir índice a letra (A, B, C, ...)
        teams: grupo.map((equipo) => ({
          id: equipo.originalId,
          name: equipo.name,
          country: equipo.country,
          bombo: equipo.bombo,
          logo: equipo.logo
            ? `http://localhost:3000/uploads/${equipo.logo}`
            : null,
          isCurrentChampion: equipo.isCurrentChampion,
          isFromQualifiers: equipo.isFromQualifiers,
        })),
      };
    });

    return {
      groups: result,
    };
  }

  // Funciones privadas para el algoritmo de sorteo

  private esValido(
    grupo: Equipo[],
    equipo: Equipo,
    bombosUsadosEnGrupo: Set<number>,
  ): boolean {
    // Verifica restricciones de país y bombo
    for (const e of grupo) {
      // Si alguno de los dos equipos es de clasificatorios, se ignora la restricción de país
      if (
        e.country === equipo.country &&
        !(e.isFromQualifiers || equipo.isFromQualifiers)
      ) {
        return false;
      }
    }

    return !bombosUsadosEnGrupo.has(equipo.bombo);
  }

  private contarOcurrencias<T>(arr: T[]): Map<T, number> {
    const counter = new Map<T, number>();
    for (const item of arr) {
      counter.set(item, (counter.get(item) || 0) + 1);
    }
    return counter;
  }

  private ordenarPorRestricciones(equipos: Equipo[]): Equipo[] {
    // Contar equipos por país, excluyendo a los de clasificatorios
    const equiposNoClasificatorios = equipos.filter((e) => !e.isFromQualifiers);
    const conteoPaises = this.contarOcurrencias(
      equiposNoClasificatorios.map((e) => e.country),
    );

    // Ordenar primero por si es campeón actual, luego por restricciones de país y por bombo
    return [...equipos].sort((a, b) => {
      // Campeón actual primero
      if (a.isCurrentChampion !== b.isCurrentChampion) {
        return b.isCurrentChampion ? 1 : -1;
      }

      // Más restricciones de país primero (si no es de clasificatorios)
      const conteoA = a.isFromQualifiers ? 0 : conteoPaises.get(a.country) || 0;
      const conteoB = b.isFromQualifiers ? 0 : conteoPaises.get(b.country) || 0;

      if (conteoA !== conteoB) {
        return conteoB - conteoA;
      }

      // Bombo alto primero
      return b.bombo - a.bombo;
    });
  }

  private shuffle<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private asignarEquipos(equipos: Equipo[]): Equipo[][] | null {
    // Preordenar los equipos por restricciones
    const equiposOrdenados = this.ordenarPorRestricciones(equipos);

    // Identificar al campeón actual
    const campeonIndex = equiposOrdenados.findIndex((e) => e.isCurrentChampion);
    const campeon = campeonIndex !== -1 ? equiposOrdenados[campeonIndex] : null;

    // Inicializar grupos
    const grupos: Equipo[][] = Array(8)
      .fill(null)
      .map(() => []);
    const bombosPorGrupo: Set<number>[] = Array(8)
      .fill(null)
      .map(() => new Set<number>());

    // Asignar primero al campeón actual al Grupo A si existe
    if (campeon) {
      grupos[0].push(campeon);
      bombosPorGrupo[0].add(campeon.bombo);
      equiposOrdenados.splice(campeonIndex, 1);
    }

    // Mezclar los demás equipos para mantener aleatoriedad
    const remainingEquipos = [...equiposOrdenados];
    this.shuffle(remainingEquipos);

    const equiposNoAsignados = [...remainingEquipos];

    // Hacer asignación iterativa con forward checking
    const maxIntentos = 1000;
    let intentos = 0;

    while (equiposNoAsignados.length > 0 && intentos < maxIntentos) {
      intentos++;

      // Seleccionar el equipo más difícil de asignar
      const equipo = equiposNoAsignados[0];

      // Encontrar grupos válidos
      const gruposValidos: number[] = [];
      for (let i = 0; i < 8; i++) {
        if (
          grupos[i].length < 4 &&
          this.esValido(grupos[i], equipo, bombosPorGrupo[i])
        ) {
          gruposValidos.push(i);
        }
      }

      if (gruposValidos.length === 0) {
        // No hay grupos válidos, reiniciar
        return null;
      }

      // Asignar al grupo con menos opciones (más restrictivo)
      const grupoIdx =
        gruposValidos[Math.floor(Math.random() * gruposValidos.length)];
      grupos[grupoIdx].push(equipo);
      bombosPorGrupo[grupoIdx].add(equipo.bombo);
      equiposNoAsignados.splice(0, 1);
    }

    // Verificar si todos los equipos fueron asignados
    if (
      equiposNoAsignados.length === 0 &&
      grupos.every((grupo) => grupo.length === 4)
    ) {
      return grupos;
    }

    return null;
  }

  private realizarSorteo(
    equipos: Equipo[],
    maxIntentos: number = 100,
  ): Equipo[][] | null {
    for (let intento = 0; intento < maxIntentos; intento++) {
      const resultado = this.asignarEquipos(equipos);
      if (resultado) {
        return resultado.map((grupo) =>
          [...grupo].sort((a, b) => a.bombo - b.bombo),
        );
      }
      if (intento % 10 === 0) {
        console.log(
          `Intento ${intento + 1}: Buscando una distribución válida...`,
        );
      }
    }

    return null;
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
