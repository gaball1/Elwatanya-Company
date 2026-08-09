export interface RoleResult {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissions?: string[];
  status?: string;
}

export interface UpdateRoleInput {
  id: string;
  name?: string;
  description?: string;
  permissions?: string[];
  status?: string;
}
