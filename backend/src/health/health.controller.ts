import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/auth.decorators';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  async check() {
    let database = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }
    const body = {
      status: database === 'up' ? 'ok' : 'degraded',
      service: 'elwataniya-erp-api',
      database,
      timestamp: new Date().toISOString(),
    };
    if (database === 'down') {
      throw new ServiceUnavailableException(body);
    }
    return body;
  }
}
