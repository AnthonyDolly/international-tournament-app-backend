import * as fs from 'fs';
import * as path from 'path';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Team, TeamDocument } from './entities/team.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamsService {
  constructor(@InjectModel(Team.name) private teamModel: Model<TeamDocument>) {}

  async create(createTeamDto: CreateTeamDto) {
    try {
      return await this.teamModel.create(createTeamDto);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.handleExceptions(error);
    }
  }

  async uploadLogo(id: string, file: Express.Multer.File) {
    if (id.length !== 24) {
      fs.unlinkSync(file.path);
      throw new BadRequestException('Invalid ObjectId');
    }

    const team = await this.teamModel.findById(id);

    if (!team) {
      fs.unlinkSync(file.path);
      throw new BadRequestException('Team not found');
    }

    if (team.logo) {
      const oldLogoPath = path.join('./uploads', team.logo);
      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
    }

    team.logo = file.filename;
    await team.save();

    return {
      ...team.toObject(),
      logo: `http://localhost:3000/uploads/${team.logo}`,
    };
  }

  async findAll() {
    const teams = await this.teamModel
      .find({ isParticipating: true })
      .sort({ isCurrentChampion: -1 });

    return teams.map((team) => ({
      ...team.toObject(),
      logo: team.logo ? `http://localhost:3000/uploads/${team.logo}` : null,
    }));
  }

  async findOne(id: string) {
    const team = await this.teamModel.findById(id).populate({
      path: 'bombo',
      select: 'name',
    });

    if (!team) {
      throw new BadRequestException(`Team with id ${id} not found`);
    }

    return {
      ...team.toObject(),
      logo: team.logo ? `http://localhost:3000/uploads/${team.logo}` : null,
    };
  }

  async update(id: string, updateTeamDto: UpdateTeamDto) {
    try {
      const updatedTeam = await this.teamModel.findByIdAndUpdate(
        id,
        {
          $set: updateTeamDto,
        },
        {
          new: true,
        },
      );

      if (!updatedTeam) {
        throw new BadRequestException(`Team with id ${id} not found`);
      }

      return updatedTeam;
    } catch (error) {
      this.handleExceptions(error);
    }
  }

  private handleExceptions(error: any) {
    if (error.code === 11000) {
      console.log(error);
      const keyValueString = Object.entries(error.keyValue)
        .map(([key, value]) => `${key}: '${value}'`)
        .join(', ');

      throw new BadRequestException(
        `Team already exists in the database { ${keyValueString} }`,
      );
    }
    console.log(error);
    throw new InternalServerErrorException(`Check Server logs`);
  }
}
