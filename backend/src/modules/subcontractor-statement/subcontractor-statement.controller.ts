import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { handleError } from '../../common/utils/handle-error';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { OwnershipService } from '@/common/services/ownership.service';
import { ListSubcontractorStatementsUseCase } from './application/use-cases/list-subcontractor-statements.use-case';
import { CreateSubcontractorStatementUseCase } from './application/use-cases/create-subcontractor-statement.use-case';
import { UpdateSubcontractorStatementUseCase } from './application/use-cases/update-subcontractor-statement.use-case';
import { DeleteSubcontractorStatementUseCase } from './application/use-cases/delete-subcontractor-statement.use-case';
import { CreateSubcontractorStatementDto, UpdateSubcontractorStatementDto } from './dto/subcontractor-statement.dto';

@ApiTags('Subcontractor Statements')
@ApiBearerAuth()
@Controller('subcontractor-statements')
export class SubcontractorStatementController {
  constructor(
    private readonly list: ListSubcontractorStatementsUseCase,
    private readonly create: CreateSubcontractorStatementUseCase,
    private readonly update: UpdateSubcontractorStatementUseCase,
    private readonly remove: DeleteSubcontractorStatementUseCase,
    private readonly ownership: OwnershipService,
  ) {}

  @Get() @ApiOperation({ summary: 'List subcontractor statements' }) @RequirePermission(Permissions.SubcontractorStatements.Read) async listAll(@CurrentUser() user?: JwtPayload) {
    const r = await this.list.execute(user); return { items: r.getValue() };
  }

  @Get(':id') @ApiOperation({ summary: 'Get subcontractor statement by id' }) @RequirePermission(Permissions.SubcontractorStatements.Read) async getById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: JwtPayload) {
    const r = await this.list.execute(user); const item = r.getValue()?.find((s) => s.id === id);
    if (!item) throw new NotFoundException('Subcontractor statement not found');
    return { statement: item };
  }

  @Post() @HttpCode(HttpStatus.CREATED) @ApiOperation({ summary: 'Create subcontractor statement' }) @RequirePermission(Permissions.SubcontractorStatements.Create) async createOne(@Body() dto: CreateSubcontractorStatementDto, @CurrentUser() user?: JwtPayload, @CurrentUser('sub') userId?: string) {
    const r = await this.create.execute({ ...dto, date: dto.date ? new Date(dto.date) : undefined }, user, userId);
    if (r.isFailure) handleError(r.error?.message, 'Failed to create');
    return { statement: r.getValue() };
  }

  @Patch(':id') @ApiOperation({ summary: 'Update subcontractor statement' }) @RequirePermission(Permissions.SubcontractorStatements.Update) async updateOne(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSubcontractorStatementDto, @CurrentUser() user?: JwtPayload, @CurrentUser('sub') userId?: string) {
    const r = await this.update.execute({ id, ...dto, date: dto.date !== undefined ? new Date(dto.date) : undefined }, user, userId);
    if (r.isFailure) handleError(r.error?.message, 'Failed to update');
    return { statement: r.getValue() };
  }

  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) @ApiOperation({ summary: 'Soft-delete subcontractor statement' }) @RequirePermission(Permissions.SubcontractorStatements.Delete) async deleteOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: JwtPayload) {
    const r = await this.remove.execute(id, user);
    if (r.isFailure) handleError(r.error?.message, 'Failed to delete');
  }
}
