import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { fileFilter, fileNamer } from 'src/common/helpers';
import { ValidateMongoIdPipe } from 'src/common/pipes/validate-mongo-id.pipe';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  create(@Body() createTeamDto: CreateTeamDto) {
    return this.teamsService.create(createTeamDto);
  }

  @Patch(':id/logo')
  @UseInterceptors(
    FileInterceptor('logo', {
      fileFilter: fileFilter,
      limits: {
        fileSize: 1024 * 1024,
      },
      storage: diskStorage({
        destination: './uploads',
        filename: fileNamer,
      }),
    }),
  )
  uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.teamsService.uploadLogo(id, file);
  }

  @Get()
  findAll() {
    return this.teamsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ValidateMongoIdPipe) id: string,
    @Body() updateTeamDto: UpdateTeamDto,
  ) {
    return this.teamsService.update(id, updateTeamDto);
  }
}
