export interface UpdateProjectInput {
  projectId: string;
  name?: string;
  location?: string;
  description?: string;
  client?: string;
  startDate?: Date | null;
  status?: string;
  progress?: number;
}
