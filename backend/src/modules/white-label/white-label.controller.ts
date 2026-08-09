import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@/common/decorators/auth.decorators';
import { WhiteLabelService, WhiteLabelResponse } from './white-label.service';

@ApiTags('White Label')
@Controller('white-label')
export class WhiteLabelController {
  constructor(private readonly service: WhiteLabelService) {}

  @Public()
  @Get('branding')
  @ApiOperation({ summary: 'Get company branding for white-label frontend' })
  async getBranding(): Promise<WhiteLabelResponse> {
    return this.service.getBranding();
  }
}
