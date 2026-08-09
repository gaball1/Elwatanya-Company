import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';

@Injectable()
export class ToolRegistryService {
  private readonly tools = new Map<string, BaseTool>();

  register(tool: BaseTool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  getAll(): BaseTool[] {
    return Array.from(this.tools.values());
  }

  findByPermission(permission: string): BaseTool[] {
    return this.getAll().filter((t) => t.requiresPermission === permission);
  }

  findByEntity(entity: string): BaseTool[] {
    return this.getAll().filter((t) => t.requiredEntity === entity);
  }
}
