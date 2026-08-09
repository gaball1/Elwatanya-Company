export interface EmployeeResult {
  id: string;
  code: string;
  fullName: string;
  nationalId: string;
  phone: string;
  email: string;
  address: string;
  birthDate: Date | null;
  hireDate: Date | null;
  departmentId: string;
  roleId: string;
  salary: number;
  status: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEmployeeInput {
  code: string;
  fullName: string;
  nationalId?: string;
  phone?: string;
  email?: string;
  address?: string;
  birthDate?: Date | null;
  hireDate?: Date | null;
  departmentId?: string;
  roleId?: string;
  salary?: number;
  status?: string;
  notes?: string;
}

export interface UpdateEmployeeInput {
  id: string;
  code?: string;
  fullName?: string;
  nationalId?: string;
  phone?: string;
  email?: string;
  address?: string;
  birthDate?: Date | null;
  hireDate?: Date | null;
  departmentId?: string;
  roleId?: string;
  salary?: number;
  status?: string;
  notes?: string;
}
