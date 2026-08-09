import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '../../domain/notification-channel.enum';
import { NotificationProvider } from '../../domain/notification-provider.interface';

@Injectable()
export class NotificationProviderRegistry {
  private readonly logger = new Logger(NotificationProviderRegistry.name);
  private providers = new Map<NotificationChannel, NotificationProvider>();

  register(provider: NotificationProvider): void {
    this.providers.set(provider.channel, provider);
    this.logger.log(`Notification provider registered: ${provider.name} (${provider.channel})`);
  }

  getProvider(channel: NotificationChannel): NotificationProvider {
    const provider = this.providers.get(channel);
    if (!provider) throw new Error(`No notification provider for channel: ${channel}`);
    return provider;
  }

  getActiveProviders(): NotificationProvider[] {
    return Array.from(this.providers.values());
  }

  hasProvider(channel: NotificationChannel): boolean {
    return this.providers.has(channel);
  }
}
