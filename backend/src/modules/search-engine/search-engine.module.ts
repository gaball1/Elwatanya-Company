import { Module } from '@nestjs/common';
import { SearchEngineService } from './search-engine.service';
import { SearchEngineController } from './search-engine.controller';
import { SearchIndexerService } from './indexers/generic-indexer.service';

@Module({
  controllers: [SearchEngineController],
  providers: [SearchEngineService, SearchIndexerService],
  exports: [SearchEngineService],
})
export class SearchEngineModule {}
