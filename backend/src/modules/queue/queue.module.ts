import { Module, Global } from '@nestjs/common';
import { InMemoryQueue } from './infrastructure/in-memory-queue';
import { QueueService } from './queue.service';

@Global()
@Module({
  providers: [InMemoryQueue, QueueService],
  exports: [InMemoryQueue, QueueService],
})
export class QueueModule {}
