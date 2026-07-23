export interface EmployerBoqItemResult {
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
}

export interface UpsertEmployerBoqItemInput {
  buildingId: string;
  itemCode?: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

export interface SetEmployerBoqItemsInput {
  buildingId: string;
  items: EmployerBoqItemResult[];
}
