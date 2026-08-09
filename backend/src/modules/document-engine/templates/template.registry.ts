import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseTemplate } from './base-template';

@Injectable()
export class TemplateRegistry {
  private readonly templates = new Map<string, BaseTemplate>();

  register(template: BaseTemplate): void {
    this.templates.set(template.name, template);
  }

  get(name: string): BaseTemplate {
    const tpl = this.templates.get(name);
    if (!tpl) throw new NotFoundException(`Template '${name}' not found`);
    return tpl;
  }

  getAll(): BaseTemplate[] {
    return Array.from(this.templates.values());
  }

  getDefinitions(): { name: string; displayName: string; description: string; requiresProject: boolean; requiresBuilding: boolean }[] {
    return this.getAll().map((t) => ({
      name: t.name,
      displayName: t.displayName,
      description: t.description,
      requiresProject: t.requiresProject,
      requiresBuilding: t.requiresBuilding,
    }));
  }
}
