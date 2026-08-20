import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { DomainEventsModule } from '../domain-events/domain-events.module';
import { NotificationProviderRegistry } from './infrastructure/providers/provider-registry.service';
import { InAppNotificationProvider } from './infrastructure/providers/in-app-notification.provider';
import { EmailNotificationProvider } from './infrastructure/providers/email-notification.provider';
import { SmsNotificationProvider } from './infrastructure/providers/sms-notification.provider';
import { TemplateRendererService } from './infrastructure/templates/template-renderer.service';
import { NotificationEngineService } from './notification-engine.service';

@Module({
  imports: [PrismaModule, DomainEventsModule],
  providers: [
    NotificationProviderRegistry,
    InAppNotificationProvider,
    EmailNotificationProvider,
    SmsNotificationProvider,
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
    private readonly email: EmailNotificationProvider,
    private readonly sms: SmsNotificationProvider,
  ) {
    this.registry.register(this.inApp);
    this.registry.register(this.email);
    this.registry.register(this.sms);
  }
}
