import { Module } from '@nestjs/common';
import { EntityNoteService } from './entity-note.service';
import { EntityNoteController } from './entity-note.controller';

@Module({
  controllers: [EntityNoteController],
  providers: [EntityNoteService],
  exports: [EntityNoteService],
})
export class EntityNoteModule {}
