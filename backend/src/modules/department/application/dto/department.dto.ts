export interface DepartmentResult {
  id: string;
  code: string;
  name: string;
  description: string;
  managerId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDepartmentInput {
  code: string;
  name: string;
  description?: string;
  managerId?: string;
  status?: string;
}

export interface UpdateDepartmentInput {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  managerId?: string;
  status?: string;
}
