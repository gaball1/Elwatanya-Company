export interface WarehouseResult {
  id: string;
  code: string;
  name: string;
  location: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWarehouseInput {
  code: string;
  name: string;
  location?: string;
  status?: string;
}

export interface UpdateWarehouseInput {
  id: string;
  code?: string;
  name?: string;
  location?: string;
  status?: string;
}
