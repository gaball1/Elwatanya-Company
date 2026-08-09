import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { handleError } from '../../common/utils/handle-error';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import { ListClientStatementsUseCase } from './application/use-cases/list-client-statements.use-case';
import { CreateClientStatementUseCase } from './application/use-cases/create-client-statement.use-case';
import { UpdateClientStatementUseCase } from './application/use-cases/update-client-statement.use-case';
import { DeleteClientStatementUseCase } from './application/use-cases/delete-client-statement.use-case';
import { CreateClientStatementDto, UpdateClientStatementDto } from './dto/client-statement.dto';

@ApiTags('Client Statements')
@ApiBearerAuth()
@Controller('client-statements')
export class ClientStatementController {
  constructor(
    private readonly list: ListClientStatementsUseCase,
    private readonly create: CreateClientStatementUseCase,
    private readonly update: UpdateClientStatementUseCase,
    private readonly remove: DeleteClientStatementUseCase,
  ) {}

  @Get() @ApiOperation({ summary: 'List client statements' }) @RequirePermission(Permissions.ClientStatements.Read)
  async listAll() { const r = await this.list.execute(); return { items: r.getValue() }; }

  @Get(':id') @ApiOperation({ summary: 'Get client statement by id' }) @RequirePermission(Permissions.ClientStatements.Read)
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const r = await this.list.execute(); const item = r.getValue()?.find((s) => s.id === id);
    if (!item) throw new NotFoundException('Client statement not found');
    return { statement: item };
  }

  @Post() @HttpCode(HttpStatus.CREATED) @ApiOperation({ summary: 'Create client statement' }) @RequirePermission(Permissions.ClientStatements.Create)
  async createOne(@Body() dto: CreateClientStatementDto) {
    const r = await this.create.execute({
      ...dto, date: dto.date ? new Date(dto.date) : undefined,
    });
    if (r.isFailure) handleError(r.error?.message, 'Failed to create');
    return { statement: r.getValue() };
  }

  @Patch(':id') @ApiOperation({ summary: 'Update client statement' }) @RequirePermission(Permissions.ClientStatements.Update)
  async updateOne(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateClientStatementDto) {
    const r = await this.update.execute({
      id, ...dto, date: dto.date !== undefined ? new Date(dto.date) : undefined,
    });
    if (r.isFailure) handleError(r.error?.message, 'Failed to update');
    return { statement: r.getValue() };
  }

  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) @ApiOperation({ summary: 'Soft-delete client statement' }) @RequirePermission(Permissions.ClientStatements.Delete)
  async deleteOne(@Param('id', ParseUUIDPipe) id: string) {
    const r = await this.remove.execute(id);
    if (r.isFailure) handleError(r.error?.message, 'Failed to delete');
  }
}
