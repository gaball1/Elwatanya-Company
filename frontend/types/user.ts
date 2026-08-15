export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  projectId?: string | null;
  permissions?: string[];
  roleNames?: string[];
  projectIds?: string[];
  employeeId?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
