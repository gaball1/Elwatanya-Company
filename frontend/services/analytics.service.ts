import { apiClient } from '@/lib/api/apiClient';
import { safeFetch } from '@/lib/api/fetchTransport';

export type KpiStatus = 'good' | 'warning' | 'critical' | 'neutral';

export interface KpiMetric {
  key: string;
  label: string;
  labelAr: string;
  description?: string;
  descriptionAr?: string;
  value: number;
  unit: string;
  status: KpiStatus;
}

export interface EvmResult {
  pv: number;
  ev: number;
  ac: number;
  bac: number;
  cpi: number;
  spi: number;
  sv: number;
  cv: number;
  etc: number;
  eac: number;
  vac: number;
  plannedPercent: number;
  actualPercent: number;
}

export interface ProgressResult {
  projectPercent: number;
  buildings: { id: string; name: string; percent: number; executedValue: number; totalValue: number }[];
  categories: { id: string; name: string; percent: number; executedValue: number; totalValue: number }[];
  boqs: { id: string; buildingId: string; name: string; percent: number; executedValue: number; totalValue: number }[];
}

export interface BoqItemAnalysis {
  buildingId: string;
  buildingName: string;
  itemCode: string;
  description: string;
  unit: string;
  employerRate: number;
  employerValue: number;
  analyticalValue: number | null;
  contractorValue: number | null;
  actualCost: number;
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  profit: number;
  loss: number;
  margin: number;
  variance: number;
  classification: 'very_profitable' | 'profitable' | 'break_even' | 'loss' | 'critical_loss';
  progress: number;
  revenue: number;
}

export interface BoqIntelligence {
  items: BoqItemAnalysis[];
  topProfit: BoqItemAnalysis[];
  topLoss: BoqItemAnalysis[];
  topDelayed: BoqItemAnalysis[];
  highestCost: BoqItemAnalysis[];
  highestRevenue: BoqItemAnalysis[];
  counts: Record<string, number>;
}

export interface CostTotals {
  employerValue: number;
  contractorValue: number;
  analyticalValue: number;
  actualCost: number;
  profit: number;
  margin: number;
}

export interface ContractorIntelligence {
  id: string;
  name: string;
  workType: string | null;
  assignedBOQ: number;
  completedBOQ: number;
  extractValue: number;
  paid: number;
  remaining: number;
  averageExecution: number;
  averageDelayDays: number;
  averageCost: number;
  profitContribution: number;
  ranking: number;
  reliabilityScore: number;
  qualityScore: number;
  performanceScore: number;
  buildingNames: string[];
}

export interface PurchaseIntelligence {
  purchaseBudget: number;
  actualPurchases: number;
  openOrders: { count: number; value: number };
  delivered: { count: number; value: number };
  delayed: { count: number; value: number };
  averageSupplierTimeDays: number;
  costOverrun: number;
  topSuppliers: { name: string; value: number; count: number }[];
  monthly: { month: string; value: number }[];
}

export interface TreasuryIntelligence {
  cashIn: number;
  cashOut: number;
  balance: number;
  committedPayments: number;
  upcomingPayments: number;
  netCashFlow: number;
  monthly: { month: string; cashIn: number; cashOut: number; net: number }[];
  daily: { date: string; cashIn: number; cashOut: number; net: number }[];
  forecast: { month: string; net: number; projectedBalance: number }[];
}

export interface InventoryIntelligence {
  consumption: number;
  received: number;
  currentStock: number;
  reservedStock: number;
  minimumStock: number;
  reorderItems: { id: string; code: string; name: string; quantity: number; minQuantity: number }[];
  materialCost: number;
  inventoryValue: number;
  turnover: number;
}

export interface EmployeeIntelligence {
  totalRecords: number;
  present: number;
  late: number;
  absent: number;
  attendanceRate: number;
  latePercent: number;
  absencePercent: number;
  workedHours: number;
  overtimeHours: number;
  payrollCost: number;
  costPerProject: number;
  monthly: { month: string; attendance: number; late: number; overtimeHours: number }[];
}

export interface RiskItem {
  code: string;
  label: string;
  labelAr: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  probability: number;
  impact: string;
  recommendation: string;
  relatedEntityId?: string;
}

export interface RiskResult {
  items: RiskItem[];
  score: {
    overall: number;
    level: 'low' | 'medium' | 'high' | 'critical';
    counts: Record<RiskItem['severity'], number>;
  };
}

export interface BuildingDashboard {
  id: string;
  name: string;
  progress: number;
  cost: number;
  revenue: number;
  profit: number;
  margin: number;
  boqValue: number;
  extracts: { count: number; value: number };
  contractors: { id: string; name: string; workType: string | null; value: number }[];
  materials: { count: number; value: number };
  delays: number;
  risks: RiskItem[];
}

export interface ProjectAnalytics {
  project: {
    id: string;
    name: string;
    code: string;
    status: string;
    startDate: string | null;
    plannedDurationMonths: number;
    progress: number;
    client: string | null;
  } | null;
  kpis: Record<string, KpiMetric>;
  evm: EvmResult;
  progress: ProgressResult;
  cost: CostTotals;
  boq: BoqIntelligence;
  contractors: ContractorIntelligence[];
  purchases: PurchaseIntelligence;
  treasury: TreasuryIntelligence;
  inventory: InventoryIntelligence;
  employees: EmployeeIntelligence;
  buildings: BuildingDashboard[];
  risks: RiskResult;
}

export interface ExecutiveDashboard {
  company: {
    projectCount: number;
    buildingCount: number;
    employeeCount: number;
    pendingApprovals: number;
    attendanceToday: number;
    lateToday: number;
  };
  totals: { revenue: number; cost: number; profit: number; margin: number; cashBalance: number; inventoryValue: number };
  averages: { progress: number; riskScore: number };
  projects: {
    id: string;
    name: string;
    code: string;
    status: string;
    progress: number;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
    riskScore: number;
  }[];
}

export interface DrillDownNode {
  level: 'project' | 'building' | 'boq' | 'extract' | 'payment';
  id: string;
  name: string;
  value: number;
  display: string;
  children: DrillDownNode[];
}

export const analyticsService = {
  async listProjects(): Promise<{ id: string; name: string; code: string; status: string }[]> {
    return apiClient('/analytics/projects', { method: 'GET' });
  },
  async getExecutive(): Promise<ExecutiveDashboard> {
    return apiClient('/analytics/executive', { method: 'GET' });
  },
  async getDashboard(projectId: string): Promise<ProjectAnalytics> {
    return apiClient(`/analytics/project/${projectId}/dashboard`, { method: 'GET' });
  },
  async getProgress(projectId: string): Promise<ProgressResult> {
    return apiClient(`/analytics/project/${projectId}/progress`, { method: 'GET' });
  },
  async getDrillDown(projectId: string, kpi: string): Promise<DrillDownNode> {
    return apiClient(`/analytics/project/${projectId}/drilldown?kpi=${kpi}`, { method: 'GET' });
  },
};

async function exportReport(projectId: string, format: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  const { getAccessToken } = await import('@/lib/api/tokenStorage');
  const token = getAccessToken() || '';

  const response = await safeFetch(`${baseUrl}/reporting/project_analytics/generate?format=${format}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ projectId }),
  });
  if (!response.ok) throw new Error('Report generation failed');

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || `project-analytics.${format === 'excel' ? 'xlsx' : format}`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const analyticsExport = {
  async pdf(projectId: string): Promise<void> {
    await exportReport(projectId, 'pdf');
  },
  async excel(projectId: string): Promise<void> {
    await exportReport(projectId, 'excel');
  },
  async csv(projectId: string): Promise<void> {
    await exportReport(projectId, 'csv');
  },
};
