import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateProjectUseCase } from './application/use-cases/create-project.use-case';
import { UpdateProjectUseCase } from './application/use-cases/update-project.use-case';
import { GetProjectUseCase } from './application/use-cases/get-project.use-case';
import { ListProjectsUseCase } from './application/use-cases/list-projects.use-case';
import { SoftDeleteProjectUseCase } from './application/use-cases/soft-delete-project.use-case';
import {
  ProjectApplicationError,
  ProjectErrorCode,
} from './application/errors/project-application.error';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectController {
  constructor(
    private readonly createProject: CreateProjectUseCase,
    private readonly updateProject: UpdateProjectUseCase,
    private readonly getProject: GetProjectUseCase,
    private readonly listProjects: ListProjectsUseCase,
    private readonly softDeleteProject: SoftDeleteProjectUseCase,
  ) {}
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a project' })
  @ApiResponse({ status: 201 })
  async create(@Body() dto: CreateProjectDto) {
    const result = await this.createProject.execute({
      code: dto.code,
      name: dto.name,
    });

    if (result.isFailure) {
      throw this.mapError(result.error);
    }

    return { project: result.getValue() };
  }
  @Get()
  @ApiOperation({ summary: 'List active projects' })
  async list() {
    const result = await this.listProjects.execute();
    if (result.isFailure) {
      throw this.mapError(result.error);
    }
    return { projects: result.getValue() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by id' })
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.getProject.execute(id);
    if (result.isFailure) {
      throw this.mapError(result.error);
    }
    return { project: result.getValue() };
  }
  @Patch(':id')
  @ApiOperation({ summary: 'Update project name' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    const result = await this.updateProject.execute({
      projectId: id,
      name: dto.name,
    });
    if (result.isFailure) {
      throw this.mapError(result.error);
    }
    return { project: result.getValue() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a project' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.softDeleteProject.execute(id);
    if (result.isFailure) {
      throw this.mapError(result.error);
    }
  }

  private mapError(error: Error | undefined): Error {
    if (error instanceof ProjectApplicationError) {
      switch (error.code) {
        case ProjectErrorCode.NOT_FOUND:
          return new NotFoundException(error.message);
        case ProjectErrorCode.CODE_ALREADY_EXISTS:
          return new ConflictException(error.message);
        default:
          return new BadRequestException(error.message);
      }
    }
    return new BadRequestException(error?.message ?? 'Project operation failed');
  }
}
