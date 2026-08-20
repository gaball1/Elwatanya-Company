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
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { OwnershipService } from '@/common/services/ownership.service';
import { ListProjectFundsUseCase } from './application/use-cases/list-project-funds.use-case';
import { GetProjectFundByProjectIdUseCase } from './application/use-cases/get-project-fund-by-project-id.use-case';
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
    private readonly getProjectFundByProjectId: GetProjectFundByProjectIdUseCase,
    private readonly createProjectFund: CreateProjectFundUseCase,
    private readonly updateProjectFund: UpdateProjectFundUseCase,
    private readonly deleteProjectFund: DeleteProjectFundUseCase,
    private readonly ownership: OwnershipService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List project funds' })
  @RequirePermission(Permissions.ProjectFunds.Read)
  async list(@CurrentUser() user?: JwtPayload) {
    const result = await this.listProjectFunds.execute(user);
    return { items: result.getValue() };
  }

  @Get('by-project/:projectId')
  @ApiOperation({ summary: 'Get project fund by projectId' })
  @RequirePermission(Permissions.ProjectFunds.Read)
  async getByProject(@Param('projectId') projectId: string, @CurrentUser() user?: JwtPayload) {
    const result = await this.getProjectFundByProjectId.execute(projectId, user);
    if (result.isFailure) handleError(result.error?.message, 'Failed to get project fund');
    return { fund: result.getValue() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project fund by id' })
  @RequirePermission(Permissions.ProjectFunds.Read)
  async getById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: JwtPayload) {
    const result = await this.listProjectFunds.execute(user);
    const fund = result.getValue()?.find((f) => f.id === id);
    if (!fund) throw new NotFoundException('Project fund not found');
    return { fund };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a project fund' })
  @RequirePermission(Permissions.ProjectFunds.Create)
  async create(@Body() dto: CreateProjectFundDto, @CurrentUser() user?: JwtPayload, @CurrentUser('sub') userId?: string) {
    const result = await this.createProjectFund.execute({
      projectId: dto.projectId,
      initialBalance: dto.initialBalance,
    }, user, userId);
    if (result.isFailure) handleError(result.error?.message, 'Failed to create project fund');
    return { fund: result.getValue() };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project fund' })
  @RequirePermission(Permissions.ProjectFunds.Update)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProjectFundDto, @CurrentUser() user?: JwtPayload, @CurrentUser('sub') userId?: string) {
    const result = await this.updateProjectFund.execute({
      id,
      initialBalance: dto.initialBalance,
      currentBalance: dto.currentBalance,
      pettyCashBalance: dto.pettyCashBalance,
    }, user, userId);
    if (result.isFailure) handleError(result.error?.message, 'Failed to update project fund');
    return { fund: result.getValue() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a project fund' })
  @RequirePermission(Permissions.ProjectFunds.Delete)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: JwtPayload) {
    const result = await this.deleteProjectFund.execute(id, user);
    if (result.isFailure) handleError(result.error?.message, 'Failed to delete project fund');
  }
}
