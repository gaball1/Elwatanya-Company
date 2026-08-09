export interface CategoryResult {
  id: string;
  code: string;
  name: string;
  description: string;
  parentId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryInput {
  code: string;
  name: string;
  description?: string;
  parentId?: string | null;
  status?: string;
}

export interface UpdateCategoryInput {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  parentId?: string | null;
  status?: string;
}
