export type UserRole =
  | "ceo"
  | "technical_office"
  | "site_engineer"
  | "accountant"
  | "store_manager"
  | "employee";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  projectId?: string; // للمستخدمين المخصصين لمشروع معين (مهندس موقع، مدير مخازن)
}

interface Permissions {
  // الموظفين
  canViewEmployees: boolean;
  canEditEmployees: boolean;

  // المشاريع
  canViewProjects: boolean;
  canEditProjects: boolean;
  canDeleteProjects: boolean;

  // المقاولين
  canViewSubcontractors: boolean;
  canEditSubcontractors: boolean;

  // المخازن
  canViewInventory: boolean;
  canEditInventory: boolean;

  // المستخلصات
  canViewStatements: boolean;
  canApproveStatements: boolean;

  // الخزنة والمالية
  canViewTreasury: boolean;
  canViewFinancial: boolean;

  // العملاء والموردين
  canViewClients: boolean;
  canViewSuppliers: boolean;

  // التقارير
  canViewReports: boolean;
}

const permissions: Record<UserRole, Permissions> = {
  // مدير الشركة - كل الصلاحيات
  ceo: {
    canViewEmployees: true,
    canEditEmployees: true,
    canViewProjects: true,
    canEditProjects: true,
    canDeleteProjects: true,
    canViewSubcontractors: true,
    canEditSubcontractors: true,
    canViewInventory: true,
    canEditInventory: true,
    canViewStatements: true,
    canApproveStatements: true,
    canViewTreasury: true,
    canViewFinancial: true,
    canViewClients: true,
    canViewSuppliers: true,
    canViewReports: true,
  },

  // المكتب الفني - مشاريع ومقايسات فقط
  technical_office: {
    canViewEmployees: false,
    canEditEmployees: false,
    canViewProjects: true,
    canEditProjects: true,
    canDeleteProjects: false,
    canViewSubcontractors: true,
    canEditSubcontractors: false,
    canViewInventory: false,
    canEditInventory: false,
    canViewStatements: true,
    canApproveStatements: false,
    canViewTreasury: true,
    canViewFinancial: false,
    canViewClients: true,
    canViewSuppliers: false,
    canViewReports: true,
  },

  // مهندس موقع - مشروعه فقط
  site_engineer: {
    canViewEmployees: false,
    canEditEmployees: false,
    canViewProjects: true,
    canEditProjects: true,
    canDeleteProjects: false,
    canViewSubcontractors: true,
    canEditSubcontractors: false,
    canViewInventory: true,
    canEditInventory: false,
    canViewStatements: true,
    canApproveStatements: false,
    canViewTreasury: false,
    canViewFinancial: false,
    canViewClients: false,
    canViewSuppliers: false,
    canViewReports: false,
  },

  // محاسب - كل ما يتعلق بالفلوس
  accountant: {
    canViewEmployees: false,
    canEditEmployees: false,
    canViewProjects: true,
    canEditProjects: false,
    canDeleteProjects: false,
    canViewSubcontractors: true,
    canEditSubcontractors: false,
    canViewInventory: true,
    canEditInventory: false,
    canViewStatements: true,
    canApproveStatements: true,
    canViewTreasury: true,
    canViewFinancial: true,
    canViewClients: true,
    canViewSuppliers: true,
    canViewReports: true,
  },

  // مدير مخازن - مخازن ومشتريات فقط
  store_manager: {
    canViewEmployees: false,
    canEditEmployees: false,
    canViewProjects: false,
    canEditProjects: false,
    canDeleteProjects: false,
    canViewSubcontractors: false,
    canEditSubcontractors: false,
    canViewInventory: true,
    canEditInventory: true,
    canViewStatements: false,
    canApproveStatements: false,
    canViewTreasury: false,
    canViewFinancial: false,
    canViewClients: false,
    canViewSuppliers: true,
    canViewReports: false,
  },

  // موظف عادي - عرض فقط في بعض الأماكن
  employee: {
    canViewEmployees: false,
    canEditEmployees: false,
    canViewProjects: false,
    canEditProjects: false,
    canDeleteProjects: false,
    canViewSubcontractors: false,
    canEditSubcontractors: false,
    canViewInventory: false,
    canEditInventory: false,
    canViewStatements: false,
    canApproveStatements: false,
    canViewTreasury: false,
    canViewFinancial: false,
    canViewClients: false,
    canViewSuppliers: false,
    canViewReports: false,
  },
};

// دالة للتحقق من صلاحية معينة
export function hasPermission(
  role: UserRole,
  permission: keyof Permissions
): boolean {
  return permissions[role]?.[permission] || false;
}

// دالة للتحقق من الوصول لمشروع معين
export function canAccessProject(user: User, projectId: string): boolean {
  if (
    user.role === "ceo" ||
    user.role === "technical_office" ||
    user.role === "accountant"
  ) {
    return true;
  }
  if (user.role === "site_engineer" || user.role === "store_manager") {
    return user.projectId === projectId;
  }
  return false;
}

// دالة للحصول على المستخدم الحالي (مؤقتاً - بعدين من AuthContext)
export function getCurrentUser(): User {
  // مؤقتاً نرجع مدير الشركة
  return {
    id: "1",
    name: "أحمد علي",
    email: "ahmed@elwataniya.com",
    role: "ceo",
  };
}

// دالة لتغيير الدور (للتجربة)
export function setTestRole(role: UserRole) {
  // هذه دالة تجريبية فقط للاختبار
  console.log(`Role changed to: ${role}`);
}
