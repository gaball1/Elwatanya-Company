import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MonitorService } from './monitor.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';

@ApiTags('Monitor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('monitor')
export class MonitorController {
  constructor(private readonly monitor: MonitorService) {}

  @Get('health')
  @ApiOperation({ summary: 'System health check' })
  @RequirePermission('monitor:view')
  async health() {
    return this.monitor.health();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'System metrics' })
  @RequirePermission('monitor:view')
  async metrics() {
    return this.monitor.getMetrics();
  }
}
