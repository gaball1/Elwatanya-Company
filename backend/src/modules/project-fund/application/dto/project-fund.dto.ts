export interface ProjectFundResult {
  id: string;
  projectId: string;
  initialBalance: number;
  currentBalance: number;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectFundInput {
  projectId: string;
  initialBalance?: number;
}

export interface UpdateProjectFundInput {
  id: string;
  initialBalance?: number;
  currentBalance?: number;
}
