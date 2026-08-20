import { Module } from '@nestjs/common';
import { ChangeOrderService } from './application/change-order.service';
import { ChangeOrderController } from './change-order.controller';

@Module({
  controllers: [ChangeOrderController],
  providers: [ChangeOrderService],
  exports: [ChangeOrderService],
})
export class ChangeOrderModule {}
