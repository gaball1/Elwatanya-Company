import {
  BadRequestException,
  Body,
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
import { handleError } from '../../common/utils/handle-error';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import { ListProjectBoardsUseCase } from './application/use-cases/list-project-boards.use-case';
import { CreateProjectBoardUseCase } from './application/use-cases/create-project-board.use-case';
import { UpdateProjectBoardUseCase } from './application/use-cases/update-project-board.use-case';
import { DeleteProjectBoardUseCase } from './application/use-cases/delete-project-board.use-case';
import { CreateProjectBoardDto, UpdateProjectBoardDto } from './dto/project-board.dto';

@ApiTags('Project Boards')
@ApiBearerAuth()
@Controller('project-boards')
export class ProjectBoardController {
  constructor(
    private readonly listBoards: ListProjectBoardsUseCase,
    private readonly createBoard: CreateProjectBoardUseCase,
    private readonly updateBoard: UpdateProjectBoardUseCase,
    private readonly deleteBoard: DeleteProjectBoardUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List project boards' })
  @RequirePermission(Permissions.ProjectBoards.Read)
  async list() {
    const result = await this.listBoards.execute();
    return { items: result.getValue() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project board by id' })
  @RequirePermission(Permissions.ProjectBoards.Read)
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.listBoards.execute();
    const board = result.getValue()?.find((b) => b.id === id);
    if (!board) throw new NotFoundException('Project board not found');
    return { board };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a project board' })
  @RequirePermission(Permissions.ProjectBoards.Create)
  async create(@Body() dto: CreateProjectBoardDto) {
    const result = await this.createBoard.execute({
      buildingId: dto.buildingId,
      name: dto.name,
      description: dto.description,
      image: dto.image,
      date: dto.date ? new Date(dto.date) : undefined,
      createdBy: dto.createdBy,
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to create board');
    return { board: result.getValue() };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project board' })
  @RequirePermission(Permissions.ProjectBoards.Update)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProjectBoardDto) {
    const result = await this.updateBoard.execute({
      id,
      buildingId: dto.buildingId,
      name: dto.name,
      description: dto.description,
      image: dto.image,
      date: dto.date !== undefined ? new Date(dto.date) : undefined,
      createdBy: dto.createdBy,
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to update board');
    return { board: result.getValue() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a project board' })
  @RequirePermission(Permissions.ProjectBoards.Delete)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.deleteBoard.execute(id);
    if (result.isFailure) handleError(result.error?.message, 'Failed to delete board');
  }
}
