export interface CreateBuildingInput {
  projectId: string;
  name: string;
  code?: string;
  type?: string;
  startDate?: Date | null;
  description?: string;
  status?: string;
  latitude?: number | null;
  longitude?: number | null;
  allowedRadius?: number | null;
}

export interface UpdateBuildingInput {
  buildingId: string;
  name?: string;
  code?: string;
  type?: string;
  startDate?: Date | null;
  description?: string;
  status?: string;
  latitude?: number | null;
  longitude?: number | null;
  allowedRadius?: number | null;
}

export interface BuildingResult {
  id: string;
  projectId: string;
  name: string;
  code: string;
  type: string;
  startDate: Date | null;
  description: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  allowedRadius: number | null;
  createdAt: Date;
  updatedAt: Date;
}
