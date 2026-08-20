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
import { ListFundTransactionsUseCase } from './application/use-cases/list-fund-transactions.use-case';
import { CreateFundTransactionUseCase } from './application/use-cases/create-fund-transaction.use-case';
import { UpdateFundTransactionUseCase } from './application/use-cases/update-fund-transaction.use-case';
import { DeleteFundTransactionUseCase } from './application/use-cases/delete-fund-transaction.use-case';
import { CreateFundTransactionDto, UpdateFundTransactionDto } from './dto/fund-transaction.dto';

@ApiTags('Fund Transactions')
@ApiBearerAuth()
@Controller('fund-transactions')
export class FundTransactionController {
  constructor(
    private readonly listFundTransactions: ListFundTransactionsUseCase,
    private readonly createFundTransaction: CreateFundTransactionUseCase,
    private readonly updateFundTransaction: UpdateFundTransactionUseCase,
    private readonly deleteFundTransaction: DeleteFundTransactionUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List fund transactions' })
  @RequirePermission(Permissions.FundTransactions.Read)
  async list(@CurrentUser() user?: JwtPayload) {
    const result = await this.listFundTransactions.execute(user);
    return { items: result.getValue() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get fund transaction by id' })
  @RequirePermission(Permissions.FundTransactions.Read)
  async getById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: JwtPayload) {
    const result = await this.listFundTransactions.execute(user);
    const fundTransaction = result.getValue()?.find((t) => t.id === id);
    if (!fundTransaction) throw new NotFoundException('Fund transaction not found');
    return { transaction: fundTransaction };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a fund transaction' })
  @RequirePermission(Permissions.FundTransactions.Create)
  async create(@Body() dto: CreateFundTransactionDto, @CurrentUser() user?: JwtPayload, @CurrentUser('sub') userId?: string) {
    const result = await this.createFundTransaction.execute({
      fundId: dto.fundId,
      type: dto.type as any,
      amount: dto.amount,
      category: dto.category as any,
      description: dto.description,
      date: dto.date ? new Date(dto.date) : undefined,
      status: dto.status as any,
      referenceId: dto.referenceId,
      notes: dto.notes,
    }, user, userId);
    if (result.isFailure) handleError(result.error?.message, 'Failed to create fund transaction');
    return { transaction: result.getValue() };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update fund transaction' })
  @RequirePermission(Permissions.FundTransactions.Update)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFundTransactionDto, @CurrentUser() user?: JwtPayload, @CurrentUser('sub') userId?: string) {
    const result = await this.updateFundTransaction.execute({
      id,
      fundId: dto.fundId,
      type: dto.type as any,
      amount: dto.amount,
      category: dto.category as any,
      description: dto.description,
      date: dto.date !== undefined ? new Date(dto.date) : undefined,
      status: dto.status as any,
      referenceId: dto.referenceId,
      notes: dto.notes,
    }, user, userId);
    if (result.isFailure) handleError(result.error?.message, 'Failed to update fund transaction');
    return { transaction: result.getValue() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a fund transaction' })
  @RequirePermission(Permissions.FundTransactions.Delete)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user?: JwtPayload) {
    const result = await this.deleteFundTransaction.execute(id, user);
    if (result.isFailure) handleError(result.error?.message, 'Failed to delete fund transaction');
  }
}
