export interface ContractorBoqItemResult {
  id: string;
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  assignedQuantity: number;
  unitPrice: number;
  totalValue: number;
  componentId?: string | null;
  finalItemId?: string | null;
}

export interface ContractorBoqMetaResult {
  buildingId: string;
  contractorId: string;
  workType: string;
  createdAt: string;
}

export interface AllocateContractorItemInput {
  buildingId: string;
  contractorId: string;
  itemCodeOrComponent: string;
  quantity: number;
}

export interface UpdateContractorItemQuantityInput {
  buildingId: string;
  contractorId: string;
  itemCode: string;
  componentId?: string;
  quantity: number;
}

export interface SetContractorMetaInput {
  buildingId: string;
  contractorId: string;
  workType: string;
}
