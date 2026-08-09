import { Injectable } from '@nestjs/common';
import { NotificationTemplate, NotificationMessage } from '../../domain/notification-provider.interface';
import { NotificationChannel } from '../../domain/notification-channel.enum';

@Injectable()
export class TemplateRendererService {
  private templates = new Map<string, NotificationTemplate>();

  register(template: NotificationTemplate): void {
    const key = `${template.eventName}:${template.channel}`;
    this.templates.set(key, template);
  }

  render(eventName: string, channel: NotificationChannel, variables: Record<string, any>): {
    title: string;
    titleEn: string;
    body: string;
    bodyEn: string;
  } | null {
    const key = `${eventName}:${channel}`;
    const template = this.templates.get(key);
    if (!template) return null;

    return {
      title: this.interpolate(template.subjectTemplate, variables),
      titleEn: this.interpolate(template.subjectTemplateEn, variables),
      body: this.interpolate(template.bodyTemplate, variables),
      bodyEn: this.interpolate(template.bodyTemplateEn, variables),
    };
  }

  private interpolate(template: string, vars: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = vars[key];
      return value !== undefined ? String(value) : `{{${key}}}`;
    });
  }
}
