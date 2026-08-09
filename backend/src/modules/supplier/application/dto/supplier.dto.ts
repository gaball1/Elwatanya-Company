export interface SupplierResult {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  products: string[];
  paymentTerms: string;
  joinDate: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSupplierInput {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  products?: string[];
  paymentTerms?: string;
  joinDate?: Date | null;
  status?: string;
}

export interface UpdateSupplierInput {
  id: string;
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  products?: string[];
  paymentTerms?: string;
  joinDate?: Date | null;
  status?: string;
}
