export interface CreateBuildingInput {
  projectId: string;
  name: string;
}

export interface UpdateBuildingInput {
  buildingId: string;
  name: string;
}

export interface BuildingResult {
  id: string;
  projectId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
