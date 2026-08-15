export interface WarehouseResult {
  id: string;
  projectId: string | null;
  code: string;
  name: string;
  location: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWarehouseInput {
  projectId?: string;
  code: string;
  name: string;
  location?: string;
  status?: string;
}

export interface UpdateWarehouseInput {
  id: string;
  projectId?: string;
  code?: string;
  name?: string;
  location?: string;
  status?: string;
}
