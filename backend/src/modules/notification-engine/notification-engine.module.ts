import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { DomainEventsModule } from '../domain-events/domain-events.module';
import { NotificationProviderRegistry } from './infrastructure/providers/provider-registry.service';
import { InAppNotificationProvider } from './infrastructure/providers/in-app-notification.provider';
import { TemplateRendererService } from './infrastructure/templates/template-renderer.service';
import { NotificationEngineService } from './notification-engine.service';

@Module({
  imports: [PrismaModule, DomainEventsModule],
  providers: [
    NotificationProviderRegistry,
    InAppNotificationProvider,
    TemplateRendererService,
    NotificationEngineService,
    {
      provide: 'NOTIFICATION_PROVIDER_IN_APP',
      useExisting: InAppNotificationProvider,
    },
  ],
  exports: [NotificationEngineService, NotificationProviderRegistry],
})
export class NotificationEngineModule {
  constructor(
    private readonly registry: NotificationProviderRegistry,
    private readonly inApp: InAppNotificationProvider,
  ) {
    this.registry.register(this.inApp);
  }
}
