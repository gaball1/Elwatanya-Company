import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListSubcontractorsUseCase } from './application/use-cases/list-subcontractors.use-case';

@ApiTags('Subcontractors')
@ApiBearerAuth()
@Controller('subcontractors')
export class SubcontractorController {
  constructor(private readonly listSubcontractors: ListSubcontractorsUseCase) {}

  @Get()
  @ApiOperation({ summary: 'List subcontractors' })
  async list() {
    const result = await this.listSubcontractors.execute();
    return { items: result.getValue() };
  }
}
