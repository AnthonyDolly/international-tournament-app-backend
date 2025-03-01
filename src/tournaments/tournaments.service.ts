import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Tournament } from './entities/tournament.entity';
import { Model } from 'mongoose';

@Injectable()
export class TournamentsService {
  constructor(
    @InjectModel(Tournament.name)
    private readonly tournamentModel: Model<Tournament>,
  ) {}

  async create(createTournamentDto: CreateTournamentDto) {
    try {
      return await this.tournamentModel.create(createTournamentDto);
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  async findAll() {
    return await this.tournamentModel.find();
  }

  async findOne(id: string) {
    const tournament = await this.tournamentModel.findById(id);

    if (!tournament) {
      throw new BadRequestException(`Tournament with id ${id} not found`);
    }

    return tournament;
  }

  private handleExceptions(error: any) {
    if (error.code === 11000) {
      console.log(error);
      throw new BadRequestException(
        `Tournament already exists in the database ${JSON.stringify(
          error.keyValue,
        )}`,
      );
    }
    console.log(error);
    throw new InternalServerErrorException(`Check Server logs`);
  }
}
