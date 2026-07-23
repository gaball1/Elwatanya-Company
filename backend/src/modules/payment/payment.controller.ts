import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  BuildingApplicationError,
  BuildingErrorCode,
} from '@/modules/building/application/errors/building-application.error';
import {
  ListPaymentsUseCase,
  AddPaymentUseCase,
} from './application/use-cases/payment.use-cases';
import { AddPaymentDto } from './dto/payment.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller()
export class PaymentController {
  constructor(
    private readonly listPayments: ListPaymentsUseCase,
    private readonly addPayment: AddPaymentUseCase,
  ) {}

  @Get('buildings/:buildingId/contractors/:contractorId/payments')
  @ApiOperation({ summary: 'List contractor payments (mirrors getPayments)' })
  async list(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
  ) {
    const result = await this.listPayments.execute(buildingId, contractorId);
    if (result.isFailure) throw this.mapError(result.error);
    return { items: result.getValue() };
  }

  @Post('buildings/:buildingId/contractors/:contractorId/payments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add contractor payment (mirrors addPayment)' })
  async create(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @Param('contractorId', ParseUUIDPipe) contractorId: string,
    @Body() dto: AddPaymentDto,
  ) {
    const result = await this.addPayment.execute({
      buildingId,
      contractorId,
      amount: dto.amount,
      date: dto.date,
      extractId: dto.extractId,
      notes: dto.notes,
    });
    if (result.isFailure) throw this.mapError(result.error);
    return { payment: result.getValue() };
  }

  private mapError(error: Error | undefined): Error {
    if (error instanceof BuildingApplicationError) {
      if (error.code === BuildingErrorCode.NOT_FOUND) {
        return new NotFoundException(error.message);
      }
      return new BadRequestException(error.message);
    }
    return new BadRequestException(error?.message ?? 'Payment operation failed');
  }
}
