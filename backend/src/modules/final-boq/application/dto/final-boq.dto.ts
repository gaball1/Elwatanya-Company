export interface FinalBoqComponentResult {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  isDistributed: boolean;
  remainingQuantity: number;
  distribution: {
    contractorId: string;
    contractorName: string;
    quantity: number;
    percentage: number;
    assignedAt: string;
  }[];
}

export interface FinalBoqItemResult {
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  remainingQuantity: number;
  isAnalyzed: boolean;
  status: string;
  components: FinalBoqComponentResult[];
  /** Item-level distribution for non-analyzed items (componentId === null). */
  itemDistribution: {
    contractorId: string;
    contractorName: string;
    quantity: number;
    percentage: number;
    assignedAt: string;
  }[];
}

export interface FinalBoqTotalsResult {
  quantity: number;
  remainingQuantity: number;
  totalValue: number;
}

export interface SyncFinalFromAnalyticalInput {
  buildingId: string;
}

export interface ImportFinalFromEmployerInput {
  buildingId: string;
  itemCode: string;
}

export interface UpdateFinalBoqItemInput {
  buildingId: string;
  itemCode: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  unit?: string;
  status?: string;
}

export interface UpdateFinalItemQuantityInput {
  buildingId: string;
  itemCode: string;
  quantity: number;
  unitPrice?: number;
}

export interface AnalyzeFinalBoqItemInput {
  buildingId: string;
  itemCode: string;
  components: { name: string; unit: string; unitPrice: number }[];
}

export interface UnanalyzeFinalBoqItemInput {
  buildingId: string;
  itemCode: string;
}

export interface AddFinalBoqComponentInput {
  buildingId: string;
  itemCode: string;
  name: string;
  unit: string;
  unitPrice: number;
}

export interface UpdateFinalBoqComponentInput {
  buildingId: string;
  itemCode: string;
  componentId: string;
  unitPrice?: number;
  quantity?: number;
}

export interface RemoveFinalBoqComponentInput {
  buildingId: string;
  itemCode: string;
  componentId: string;
}
