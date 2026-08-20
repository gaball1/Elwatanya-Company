import { apiClient } from "@/lib/api/apiClient";

export interface RecycleBinItem {
  id: string;
  name: string;
  entity: string;
  deletedAt: string;
}

export interface EntityStats {
  total: number;
  deleted: number;
}

export const recycleBinService = {
  async listDeleted(entity?: string): Promise<{ items: RecycleBinItem[] }> {
    const qs = entity ? `?entity=${entity}` : "";
    return apiClient(`/recycle-bin${qs}`);
  },

  async getStats(): Promise<Record<string, EntityStats>> {
    return apiClient("/recycle-bin/stats");
  },

  async restore(entity: string, id: string): Promise<{ success: boolean }> {
    return apiClient(`/recycle-bin/${entity}/${id}/restore`, { method: "POST" });
  },

  async permanentDelete(entity: string, id: string): Promise<{ success: boolean }> {
    return apiClient(`/recycle-bin/${entity}/${id}`, { method: "DELETE" });
  },
};
