export interface UpdateProjectInput {
  projectId: string;
  name?: string;
  location?: string;
  description?: string;
  client?: string;
  startDate?: Date | null;
  plannedDurationMonths?: number;
  status?: string;
  progress?: number;
}
