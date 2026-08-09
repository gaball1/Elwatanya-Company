import { Injectable } from '@nestjs/common';

@Injectable()
export class TemplateEngineService {
  render(template: string, variables: Record<string, any>): string {
    let result = template;

    // Simple {{variable}} replacement
    result = result.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = variables[key];
      return value !== undefined && value !== null ? String(value) : `{{${key}}}`;
    });

    // {{#if variable}}...{{/if}} blocks
    result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, content) => {
      return variables[key] ? content : '';
    });

    // {{#each variable}}...{{this}}...{{/each}} blocks
    result = result.replace(/\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, key, template) => {
      const items = variables[key];
      if (!Array.isArray(items)) return '';
      return items.map((item: any) => {
        return template.replace(/\{\{this\}\}/g, String(item))
          .replace(/\{\{(\w+)\}\}/g, (_match: string, prop: string) => {
            const val = typeof item === 'object' ? item[prop] : item;
            return val !== undefined && val !== null ? String(val) : `{{${prop}}}`;
          });
      }).join('');
    });

    return result;
  }

  extractPlaceholders(template: string): string[] {
    const matches = template.match(/\{\{(\w+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))];
  }
}
