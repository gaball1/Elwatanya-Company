import {
  AnalyticsDataset,
  RiskItem,
} from '../domain/analytics.types';
import {
  computeBoqIntelligence,
  computeEarnedValue,
  computeProgress,
  daysBetween,
  num,
  pctSafe,
  round2,
  sum,
} from './analytics-math';

export interface RiskScore {
  overall: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  counts: Record<RiskItem['severity'], number>;
}

export interface RiskEngineResult {
  items: RiskItem[];
  score: RiskScore;
}

interface RiskContext {
  ev: ReturnType<typeof computeEarnedValue>;
  progress: ReturnType<typeof computeProgress>;
  boq: ReturnType<typeof computeBoqIntelligence>;
}

function add(items: RiskItem[], item: RiskItem): void {
  items.push(item);
}

function computeRiskScore(items: RiskItem[]): RiskScore {
  const weights: Record<RiskItem['severity'], number> = { critical: 100, high: 75, medium: 50, low: 25 };
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  let total = 0;
  for (const r of items) {
    counts[r.severity] += 1;
    total += weights[r.severity] * r.probability;
  }
  const overall = items.length > 0 ? round2(total / items.length) : 0;
  const level: RiskScore['level'] = overall >= 75 ? 'critical' : overall >= 50 ? 'high' : overall >= 25 ? 'medium' : 'low';
  return { overall, level, counts };
}

export function computeRisks(ds: AnalyticsDataset): RiskEngineResult {
  const ctx: RiskContext = {
    ev: computeEarnedValue(ds),
    progress: computeProgress(ds),
    boq: computeBoqIntelligence(ds),
  };

  const items: RiskItem[] = [];
  const now = Date.now();

  if (ctx.ev.spi < 0.9) {
    add(items, {
      code: 'schedule_delay',
      label: 'Schedule is behind plan',
      labelAr: 'تأخر الجدول الزمني عن الخطة',
      severity: ctx.ev.spi < 0.6 ? 'high' : 'medium',
      probability: 0.7,
      impact: `${round2((1 - ctx.ev.spi) * 100)}% SPI shortfall`,
      recommendation: 'Re-baseline the schedule and add resources to critical path items.',
    });
  }

  if (ctx.ev.cpi < 0.9) {
    add(items, {
      code: 'cost_overrun',
      label: 'Costs exceed earned value',
      labelAr: 'التكاليف تتجاوز القيمة المكتسبة',
      severity: ctx.ev.cpi < 0.6 ? 'high' : 'medium',
      probability: 0.8,
      impact: `CPI ${ctx.ev.cpi} — EAC projected at ${ctx.ev.eac}`,
      recommendation: 'Review contractor estimates and tighten procurement controls.',
    });
  }

  if (ctx.ev.vac < 0) {
    add(items, {
      code: 'budget_at_completion',
      label: 'Budget-at-completion is overrun',
      labelAr: 'تجاوز الميزانية عند الإنجاز',
      severity: Math.abs(ctx.ev.vac) / Math.max(1, ctx.ev.bac) > 0.15 ? 'high' : 'medium',
      probability: 0.6,
      impact: `VAC ${ctx.ev.vac}`,
      recommendation: 'Run a re-estimate (EAC) and seek client change orders for scope growth.',
    });
  }

  if (ctx.ev.eac > 0 && ctx.ev.bac > 0 && ctx.ev.eac / ctx.ev.bac > 1.15) {
    add(items, {
      code: 'eac_escalation',
      label: 'EAC exceeds BAC significantly',
      labelAr: 'التقدير النهائي أعلى بكثير من الميزانية',
      severity: 'high',
      probability: 0.5,
      impact: `${round2((ctx.ev.eac / ctx.ev.bac) * 100)}% of BAC`,
      recommendation: 'Negotiate revised rates with subcontractors before further commitments.',
    });
  }

  const delayedBoqs = ctx.progress.boqs.filter((b) => b.percent < 30 && ds.contractorBoqs.find((x) => x.id === b.id)?.createdAt);
  for (const boq of delayedBoqs) {
    const cb = ds.contractorBoqs.find((x) => x.id === boq.id);
    if (!cb?.createdAt) continue;
    const elapsed = daysBetween(cb.createdAt, new Date(now));
    if (elapsed > 60 && boq.percent < 20) {
      add(items, {
        code: `boq_delay_${boq.id}`,
        label: `Contractor BOQ "${boq.name}" is critically slow`,
        labelAr: `عقد مقاول "${boq.name}" متأخر بشكل حرج`,
        severity: 'high',
        probability: 0.7,
        impact: `${boq.percent}% executed in ${elapsed} days`,
        recommendation: 'Hold a performance review with the subcontractor or consider substitution.',
        relatedEntityId: boq.id,
      });
    }
  }

  const lossItems = ctx.boq.topLoss.slice(0, 5);
  for (const item of lossItems) {
    add(items, {
      code: `loss_item_${item.itemCode}`,
      label: `Loss-making BOQ item ${item.itemCode}`,
      labelAr: `بند يكبد خسارة ${item.itemCode}`,
      severity: item.margin < -25 ? 'critical' : 'high',
      probability: 0.6,
      impact: `${item.itemCode} margin ${item.margin}% (loss ${item.loss})`,
      recommendation: 'Re-price the item against the employer or stop further execution until resolved.',
      relatedEntityId: item.itemCode,
    });
  }

  const purchases = ds.purchases.filter((p) => (p.status === 'pending' || p.status === 'approved') && daysBetween(p.date) > 14);
  if (purchases.length > 0) {
    add(items, {
      code: 'stale_purchase_orders',
      label: `${purchases.length} purchase orders are stale`,
      labelAr: `${purchases.length} أوامر شراء متأخرة`,
      severity: purchases.length > 5 ? 'high' : 'medium',
      probability: 0.6,
      impact: `${round2(sum(purchases.map((p) => p.total)))} in open value`,
      recommendation: 'Follow up with suppliers or cancel and re-issue against better quotes.',
    });
  }

  const clientStatements = ds.clientStatements;
  const totalClientValue = sum(clientStatements.map((s) => num(s.netPayable)));
  const receivedPayments = ds.fundTransactions.filter((t) => t.type === 'add' && t.status === 'approved');
  const receivedValue = sum(receivedPayments.map((t) => t.amount));
  const collections = totalClientValue > 0 ? pctSafe(receivedValue, totalClientValue) : 100;
  if (collections < 60 && clientStatements.length > 0) {
    add(items, {
      code: 'low_collection',
      label: 'Client collections are low',
      labelAr: 'تحصيلات العملاء منخفضة',
      severity: collections < 30 ? 'critical' : 'high',
      probability: 0.6,
      impact: `${collections}% collected against statements`,
      recommendation: 'Escalate invoicing and payment follow-up with the client finance team.',
    });
  }

  const contractors = ds.contractorBoqs.filter((cb) => cb.status.toLowerCase() === 'inprogress' && daysBetween(cb.createdAt ?? now) > 90);
  if (contractors.length > 0 && totalClientValue > 0) {
    add(items, {
      code: 'long_running_contracts',
      label: `${contractors.length} contracts have run over 90 days`,
      labelAr: `${contractors.length} عقود تجاوزت 90 يوماً`,
      severity: 'medium',
      probability: 0.4,
      impact: 'Increased risk of claims and liquidated damages',
      recommendation: 'Validate progress claims promptly and close out finished works.',
    });
  }

  const reorder = ds.inventoryItems.filter((i) => num(i.quantity) <= num(i.minQuantity));
  if (reorder.length > 0) {
    add(items, {
      code: 'stock_exhaustion',
      label: `${reorder.length} inventory items at or below reorder point`,
      labelAr: `${reorder.length} أصناف مخزنية في حد الطلب`,
      severity: reorder.length > 10 ? 'high' : 'medium',
      probability: 0.5,
      impact: `${reorder.length} items need replenishment`,
      recommendation: 'Issue purchase orders for reorder items before shortages block execution.',
    });
  }

  const pendingApprovals = num(ds.pendingApprovals);
  if (pendingApprovals > 0) {
    add(items, {
      code: 'pending_approvals',
      label: `${pendingApprovals} pending approvals`,
      labelAr: `${pendingApprovals} موافقة معلقة`,
      severity: pendingApprovals > 10 ? 'medium' : 'low',
      probability: 0.3,
      impact: 'Workflow bottlenecks delay procurement and payments',
      recommendation: 'Clear the approval queue and enforce SLA on reviewers.',
    });
  }

  return {
    items,
    score: computeRiskScore(items),
  };
}
