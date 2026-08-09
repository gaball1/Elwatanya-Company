export interface AnalyticsProject {
  id: string;
  name: string;
  code: string;
  status: string;
  startDate: Date | null;
  progress: number;
  client: string | null;
}

export interface AnalyticsBuilding {
  id: string;
  name: string;
  code: string;
  status: string;
  startDate: Date | null;
}

export interface EmployerBoqItemRow {
  buildingId: string;
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
}

export interface AnalyticalBoqItemRow {
  buildingId: string;
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
}

export interface FinalBoqItemRow {
  id: string;
  finalBoqId: string;
  businessCode: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  itemStatus: string;
  parentItemId: string | null;
}

export interface ComponentRow {
  id: string;
  finalBoqItemId: string;
  businessCode: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
}

export interface ContractorBoqRow {
  id: string;
  buildingId: string;
  subcontractorId: string | null;
  workType: string | null;
  status: string;
  createdAt: Date;
}

export interface ContractorBoqItemRow {
  id: string;
  contractorBoqId: string;
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  assignedQuantity: number;
  unitPrice: number;
  totalValue: number;
  finalItemId: string | null;
  componentId: string | null;
}

export interface StatementRow {
  id: string;
  contractorBoqId: string;
  status: string;
  sequenceNumber: number;
  runningNumber: number | null;
  netPayable: number;
  totalWorkValue: number;
  previousPaid: number;
  extractDate: Date;
  label: string | null;
}

export interface StatementItemRow {
  statementId: string;
  contractorBoqItemId: string;
  itemCode: string;
  totalExecuted: number;
  executionPercent: number;
  currentWorkValue: number;
  unitPrice: number;
}

export interface PaymentRow {
  id: string;
  buildingId: string | null;
  contractorId: string | null;
  statementId: string | null;
  amount: number;
  paidAt: Date;
}

export interface PurchaseRow {
  id: string;
  projectId: string;
  buildingId: string | null;
  supplierId: string | null;
  supplierName: string | null;
  itemName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  status: string;
  date: Date;
}

export interface FundTransactionRow {
  id: string;
  fundId: string;
  type: string;
  category: string;
  amount: number;
  status: string;
  date: Date;
  description: string;
}

export interface MiscExpenseRow {
  id: string;
  projectId: string;
  description: string;
  amount: number;
  category: string;
  date: Date;
}

export interface InventoryItemRow {
  id: string;
  code: string;
  name: string;
  quantity: number;
  minQuantity: number;
  price: number;
  categoryId: string | null;
  warehouseId: string | null;
}

export interface StockMovementRow {
  id: string;
  itemId: string;
  type: string;
  quantity: number;
  date: Date;
}

export interface AttendanceRow {
  id: string;
  employeeId: string | null;
  date: Date;
  workedMinutes: number | null;
  hoursWorked: number;
  attendanceStatus: string;
  status: string;
  buildingId: string | null;
}

export interface EmployeeRow {
  id: string;
  fullName: string;
  salary: number;
  status: string;
  departmentId: string | null;
}

export interface SubcontractorRow {
  id: string;
  name: string;
  workType: string | null;
  marginType: string;
  marginValue: number;
  status: string;
}

export interface DepartmentRow {
  id: string;
  name: string;
}

export interface ClientStatementRow {
  id: string;
  projectId: string;
  buildingId: string | null;
  buildingName: string | null;
  clientId: string | null;
  date: Date;
  status: string;
  totalWorkValue: number;
  totalDeductions: number;
  netPayable: number;
}

export interface SubcontractorStatementRow {
  id: string;
  projectId: string;
  buildingId: string | null;
  buildingName: string | null;
  subcontractorId: string | null;
  subcontractorName: string | null;
  date: Date;
  status: string;
  totalWorkValue: number;
  totalDeductions: number;
  previousPaid: number;
  netPayable: number;
}

export interface ProjectFundRow {
  id: string;
  projectId: string;
  initialBalance: number;
  currentBalance: number;
}

export interface AnalyticsDataset {
  project: AnalyticsProject | null;
  buildings: AnalyticsBuilding[];
  employerItems: EmployerBoqItemRow[];
  analyticalItems: AnalyticalBoqItemRow[];
  finalBoqItems: FinalBoqItemRow[];
  components: ComponentRow[];
  contractorBoqs: ContractorBoqRow[];
  contractorBoqItems: ContractorBoqItemRow[];
  statements: StatementRow[];
  statementItems: StatementItemRow[];
  payments: PaymentRow[];
  purchases: PurchaseRow[];
  fund: ProjectFundRow | null;
  fundTransactions: FundTransactionRow[];
  miscellaneous: MiscExpenseRow[];
  inventoryItems: InventoryItemRow[];
  stockMovements: StockMovementRow[];
  attendance: AttendanceRow[];
  employees: EmployeeRow[];
  departments: DepartmentRow[];
  subcontractors: SubcontractorRow[];
  clientStatements: ClientStatementRow[];
  subcontractorStatements: SubcontractorStatementRow[];
  pendingApprovals: number;
}

export interface KpiMetric {
  key: string;
  label: string;
  labelAr: string;
  description?: string;
  descriptionAr?: string;
  value: number;
  display: string;
  unit: string;
  status: 'good' | 'warning' | 'critical' | 'neutral';
  trend?: 'up' | 'down' | 'stable';
  drillDown?: string;
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
  relatedEntityName?: string;
}

export interface DrillDownNode {
  level: string;
  id: string;
  name: string;
  value: number;
  display: string;
  children: DrillDownNode[];
}
