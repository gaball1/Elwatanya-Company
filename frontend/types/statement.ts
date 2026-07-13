// types/statement.ts
export interface StatementItem {
  id: string;
  itemName: string; // بيان الأعمال
  unit: string; // الوحدة
  previous: number; // السابق
  current: number; // الحالي
  total: number; // الإجمالي
  executionPercentage: number; // نسبة التنفيذ
  quantity: number; // الكمية المنفذة
  unitPrice: number; // الفئة
  totalAmount: number; // قيمة الأعمال
  hasInsurance: boolean; // هل عليه تأمين 5%
  insuranceAmount: number; // مبلغ التأمين
  netAmount: number; // الإجمالي بعد التأمين
}

export interface StatementDeduction {
  id: string;
  name: string; // اسم الخصم (خصم من اللبشة، تأمين، إلخ)
  amount: number; // المبلغ
}

export interface SubcontractorStatement {
  id: string;
  projectId: string;
  projectName: string;
  buildingName: string;
  subcontractorId: string;
  subcontractorName: string;
  workType: string; // البند الأساسي (نجار مسلح، حداد، إلخ)
  statementNumber: string; // رقم المستخلص (B-T-B-9, B-T-A-26)
  date: string; // التاريخ
  items: StatementItem[];
  deductions: StatementDeduction[];
  totalWorkValue: number; // إجمالي قيمة الأعمال
  totalDeductions: number; // إجمالي الخصومات
  previousPaid: number; // ماسبق صرفة
  netPayable: number; // المستحق صرفة
  notes?: string;
}
