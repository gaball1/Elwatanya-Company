import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';

@ApiTags('Accounting')
@ApiBearerAuth()
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get accounting dashboard with project summaries and totals' })
  @RequirePermission(Permissions.Settings.Read)
  async getDashboard() {
    return this.accountingService.getDashboard();
  }
}
