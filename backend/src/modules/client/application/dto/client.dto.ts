export interface ClientResult {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  contactPerson: string;
  joinDate: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClientInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  joinDate?: Date | null;
  status?: string;
}

export interface UpdateClientInput {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  joinDate?: Date | null;
  status?: string;
}
