export interface AnalyticalBoqItemResult {
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
}

export interface SetAnalyticalBoqItemsInput {
  buildingId: string;
  items: AnalyticalBoqItemResult[];
}

export interface UpdateAnalyticalBoqItemInput {
  buildingId: string;
  itemCode: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
}

export interface ImportAnalyticalFromEmployerInput {
  buildingId: string;
  itemCode: string;
}

export interface SyncAnalyticalFromEmployerInput {
  buildingId: string;
  itemCode: string;
}

export interface AddAnalyticalFromEmployerInput {
  buildingId: string;
  itemCode: string;
}
