export enum ContractorBoqErrorCode {
  ITEM_NOT_FOUND = 'ITEM_NOT_FOUND',
  FINAL_ITEM_NOT_FOUND = 'FINAL_ITEM_NOT_FOUND',
  ALLOCATION_FAILED = 'ALLOCATION_FAILED',
  SUBCONTRACTOR_NOT_FOUND = 'SUBCONTRACTOR_NOT_FOUND',
}

export class ContractorBoqApplicationError extends Error {
  constructor(
    public readonly code: ContractorBoqErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ContractorBoqApplicationError';
  }
}
