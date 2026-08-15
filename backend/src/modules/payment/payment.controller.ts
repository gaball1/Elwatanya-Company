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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import {
  BuildingApplicationError,
  BuildingErrorCode,
} from '@/modules/building/application/errors/building-application.error';
import {
  ListPaymentsUseCase,
  AddPaymentUseCase,
  GetPaymentUseCase,
  UpdatePaymentUseCase,
  DeletePaymentUseCase,
} from './application/use-cases/payment.use-cases';
import { AddPaymentDto, UpdatePaymentDto } from './dto/payment.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller()
export class PaymentController {
  constructor(
    private readonly listPayments: ListPaymentsUseCase,
    private readonly addPayment: AddPaymentUseCase,
    private readonly getPayment: GetPaymentUseCase,
    private readonly updatePayment: UpdatePaymentUseCase,
    private readonly deletePayment: DeletePaymentUseCase,
  ) {}

  @Get('buildings/:buildingId/contractors/:contractorId/payments')
  @ApiOperation({ summary: 'List contractor payments (mirrors getPayments)' })
  @RequirePermission(Permissions.Payments.Read)
  async list(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const result = await this.listPayments.execute(buildingId, contractorId, user);
    if (result.isFailure) throw this.mapError(result.error);
    return { items: result.getValue() };
  }

  @Post('buildings/:buildingId/contractors/:contractorId/payments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add contractor payment (mirrors addPayment)' })
  @RequirePermission(Permissions.Payments.Write)
  async create(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
    @Body() dto: AddPaymentDto,
    @CurrentUser() user?: JwtPayload,
  ) {
    const result = await this.addPayment.execute({
      buildingId,
      contractorId,
      amount: dto.amount,
      date: dto.date,
      extractId: dto.extractId,
      notes: dto.notes,
    }, user);
    if (result.isFailure) throw this.mapError(result.error);
    return { payment: result.getValue() };
  }

  @Get('buildings/:buildingId/contractors/:contractorId/payments/:paymentId')
  @ApiOperation({ summary: 'Get a single contractor payment' })
  @RequirePermission(Permissions.Payments.Read)
  async get(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const result = await this.getPayment.execute(buildingId, contractorId, paymentId, user);
    if (result.isFailure) throw this.mapError(result.error);
    return { payment: result.getValue() };
  }

  @Patch('buildings/:buildingId/contractors/:contractorId/payments/:paymentId')
  @ApiOperation({ summary: 'Update a contractor payment (amount/date/notes/approve)' })
  @RequirePermission(Permissions.Payments.Write)
  async update(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() dto: UpdatePaymentDto,
    @CurrentUser() user?: JwtPayload,
    @CurrentUser('sub') userId?: string,
  ) {
    const result = await this.updatePayment.execute({
      buildingId,
      contractorId,
      paymentId,
      amount: dto.amount,
      date: dto.date,
      notes: dto.notes,
      status: dto.status,
      approvedBy: userId,
    }, user);
    if (result.isFailure) throw this.mapError(result.error);
    return { payment: result.getValue() };
  }

  @Delete('buildings/:buildingId/contractors/:contractorId/payments/:paymentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a contractor payment (soft delete + treasury reverse)' })
  @RequirePermission(Permissions.Payments.Write)
  async remove(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    const result = await this.deletePayment.execute({
      buildingId,
      contractorId,
      paymentId,
    }, user);
    if (result.isFailure) throw this.mapError(result.error);
  }

  private mapError(error: Error | undefined): Error {
    if (error instanceof BuildingApplicationError) {
      if (error.code === BuildingErrorCode.NOT_FOUND) {
        return new NotFoundException(error.message);
      }
      return new BadRequestException(error.message);
    }
    if (error?.message?.toLowerCase().includes('not found')) {
      return new NotFoundException(error.message);
    }
    return new BadRequestException(error?.message ?? 'Payment operation failed');
  }
}
