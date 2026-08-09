export interface ProjectBoardResult {
  id: string;
  buildingId: string;
  name: string;
  description: string;
  image: string;
  date: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectBoardInput {
  buildingId: string;
  name: string;
  description?: string;
  image?: string;
  date?: Date;
  createdBy?: string;
}

export interface UpdateProjectBoardInput {
  id: string;
  buildingId?: string;
  name?: string;
  description?: string;
  image?: string;
  date?: Date;
  createdBy?: string;
}
