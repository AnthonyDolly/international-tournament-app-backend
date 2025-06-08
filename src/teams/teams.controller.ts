import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseInterceptors,
  UploadedFile,
  Query,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { TeamsService } from './teams.service';
import { CreateTeamDto, UpdateTeamDto, QueryTeamsDto } from './dto';
import { fileFilter, fileNamer } from 'src/common/helpers';
import { ValidateMongoIdPipe } from 'src/common/pipes/validate-mongo-id.pipe';
import { TEAM_CONSTANTS } from './constants/team.constants';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  /**
   * Create a new team
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createTeamDto: CreateTeamDto) {
    return this.teamsService.create(createTeamDto);
  }

  /**
   * Upload a logo for a team
   */
  @Patch(':id/logo')
  @UseInterceptors(
    FileInterceptor('logo', {
      fileFilter: fileFilter,
      limits: {
        fileSize: TEAM_CONSTANTS.MAX_LOGO_FILE_SIZE,
      },
      storage: diskStorage({
        destination: TEAM_CONSTANTS.UPLOADS_DIRECTORY,
        filename: fileNamer,
      }),
    }),
  )
  uploadLogo(
    @Param('id', ValidateMongoIdPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.teamsService.uploadLogo(id, file);
  }

  /**
   * Get all teams with optional filtering and sorting
   * @example GET /teams?country=argentina&sortBy=name&sortOrder=asc
   */
  @Get()
  findAll(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    queryParams: QueryTeamsDto,
  ) {
    return this.teamsService.findAll(queryParams);
  }

  /**
   * Get a team by ID
   */
  @Get(':id')
  findOne(@Param('id', ValidateMongoIdPipe) id: string) {
    return this.teamsService.findOne(id);
  }

  /**
   * Update a team
   */
  @Patch(':id')
  update(
    @Param('id', ValidateMongoIdPipe) id: string,
    @Body() updateTeamDto: UpdateTeamDto,
  ) {
    return this.teamsService.update(id, updateTeamDto);
  }
}
