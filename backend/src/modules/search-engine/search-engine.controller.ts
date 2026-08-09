import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SearchEngineService } from './search-engine.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { SearchQuery } from './domain/search-engine.interface';

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchEngineController {
  constructor(private readonly searchEngine: SearchEngineService) {}

  @Get()
  @ApiOperation({ summary: 'Global search across all entities' })
  @RequirePermission('search:query')
  async query(
    @Query('q') q: string,
    @Query('types') types?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const query: SearchQuery = {
      text: q,
      entityTypes: types?.split(',') ?? undefined,
      page: page ?? 1,
      limit: Math.min(limit ?? 20, 100),
    };
    return this.searchEngine.search(query);
  }

  @Post('reindex')
  @ApiOperation({ summary: 'Rebuild search index' })
  @RequirePermission('search:reindex')
  async reindex() {
    await this.searchEngine.buildIndex();
    return { message: 'Search index rebuilt' };
  }
}
