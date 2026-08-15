import { describe, it, expect } from 'vitest';
import { PlannerService } from './planner.service';

describe('PlannerService.classify — Arabic ERP questions', () => {
  const planner = new PlannerService();

  it('routes "اعرض تحليل الـ BOQ لمشروع NCM-2026" to get_boq_analysis', () => {
    const r = planner.classify('اعرض تحليل الـ BOQ لمشروع NCM-2026', { projectName: 'NCM-2026' });
    expect(r.intent).toBe('get_boq_analysis');
    expect(r.confidence).toBeGreaterThanOrEqual(0.4);
    expect(r.toolName).toBe('get_boq_analysis');
  });

  it('routes "كم عدد الأصناف في المخزن؟" to list_inventory_items', () => {
    const r = planner.classify('كم عدد الأصناف في المخزن؟');
    expect(r.intent).toBe('list_inventory_items');
    expect(r.confidence).toBeGreaterThanOrEqual(0.4);
    expect(r.toolName).toBe('list_inventory_items');
  });

  it('routes "كم عدد الأصناف في المخزن؟" to inventory items, not warehouses', () => {
    const r = planner.classify('كم عدد الأصناف في المخزن؟');
    expect(r.toolName).toBe('list_inventory_items');
  });

  it('routes "اعرض البنود" to the inventory item list', () => {
    const r = planner.classify('اعرض البنود', { projectName: 'NCM-2026' });
    expect(r.toolName).toBe('list_inventory_items');
    expect(r.confidence).toBeGreaterThanOrEqual(0.4);
  });

  it('routes Arabic BOQ analysis with explicit project to get_boq_analysis', () => {
    const r = planner.classify('اعمل تحليل بنود الكميات لمشروع NCM-2026', { projectName: 'NCM-2026' });
    expect(r.intent).toBe('get_boq_analysis');
    expect(r.confidence).toBeGreaterThanOrEqual(0.4);
  });

  // Eval-suite regression cases (prisma/eval-ai-arabic.ts)
  it('routes "قولي عندنا كام مشروع" to list_projects', () => {
    const r = planner.classify('قولي عندنا كام مشروع');
    expect(r.toolName).toBe('list_projects');
  });

  it('routes "وريني مخزون المخزن الرئيسي" to inventory items, not warehouses', () => {
    const r = planner.classify('وريني مخزون المخزن الرئيسي');
    expect(r.toolName).toBe('list_inventory_items');
  });

  it('routes "اعرض الصناديق" to list_project_funds', () => {
    const r = planner.classify('اعرض الصناديق');
    expect(r.toolName).toBe('list_project_funds');
  });

  it('routes "سيولة المشروع كويسة؟" to get_cashflow', () => {
    const r = planner.classify('سيولة المشروع كويسة؟');
    expect(r.intent).toBe('get_cashflow');
  });

  it('routes "عندنا مصاريف قد ايه؟" to get_cashflow', () => {
    const r = planner.classify('عندنا مصاريف قد ايه؟');
    expect(r.intent).toBe('get_cashflow');
  });

  it('routes mixed "Show لي project NCM-2026 progress" to an accepted intent', () => {
    const r = planner.classify('Show لي project NCM-2026 progress');
    expect(['get_project_dashboard', 'list_projects']).toContain(r.intent);
  });

  it('routes "عندنا كم BOQ؟" to an accepted intent', () => {
    const r = planner.classify('عندنا كم BOQ؟');
    expect(['explain_boq', 'get_boq_analysis']).toContain(r.intent);
  });
});
