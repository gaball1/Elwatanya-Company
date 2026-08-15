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
import { ListProjectFundsUseCase } from './application/use-cases/list-project-funds.use-case';
import { CreateProjectFundUseCase } from './application/use-cases/create-project-fund.use-case';
import { UpdateProjectFundUseCase } from './application/use-cases/update-project-fund.use-case';
import { DeleteProjectFundUseCase } from './application/use-cases/delete-project-fund.use-case';
import { CreateProjectFundDto, UpdateProjectFundDto } from './dto/project-fund.dto';

@ApiTags('Project Funds')
@ApiBearerAuth()
@Controller('project-funds')
export class ProjectFundController {
  constructor(
    private readonly listProjectFunds: ListProjectFundsUseCase,
    private readonly createProjectFund: CreateProjectFundUseCase,
    private readonly updateProjectFund: UpdateProjectFundUseCase,
    private readonly deleteProjectFund: DeleteProjectFundUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List project funds' })
  @RequirePermission(Permissions.ProjectFunds.Read)
  async list() {
    const result = await this.listProjectFunds.execute();
    return { items: result.getValue() };
  }

  @Get('by-project/:projectId')
  @ApiOperation({ summary: 'Get project fund by projectId' })
  @RequirePermission(Permissions.ProjectFunds.Read)
  async getByProject(@Param('projectId') projectId: string) {
    const result = await this.listProjectFunds.execute();
    const fund = result.getValue()?.find((f) => f.projectId === projectId);
    if (!fund) return { fund: null };
    return { fund };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project fund by id' })
  @RequirePermission(Permissions.ProjectFunds.Read)
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.listProjectFunds.execute();
    const fund = result.getValue()?.find((f) => f.id === id);
    if (!fund) throw new NotFoundException('Project fund not found');
    return { fund };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a project fund' })
  @RequirePermission(Permissions.ProjectFunds.Create)
  async create(@Body() dto: CreateProjectFundDto) {
    const result = await this.createProjectFund.execute({
      projectId: dto.projectId,
      initialBalance: dto.initialBalance,
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to create project fund');
    return { fund: result.getValue() };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project fund' })
  @RequirePermission(Permissions.ProjectFunds.Update)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProjectFundDto) {
    const result = await this.updateProjectFund.execute({
      id,
      initialBalance: dto.initialBalance,
      currentBalance: dto.currentBalance,
      pettyCashBalance: dto.pettyCashBalance,
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to update project fund');
    return { fund: result.getValue() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a project fund' })
  @RequirePermission(Permissions.ProjectFunds.Delete)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.deleteProjectFund.execute(id);
    if (result.isFailure) handleError(result.error?.message, 'Failed to delete project fund');
  }
}
