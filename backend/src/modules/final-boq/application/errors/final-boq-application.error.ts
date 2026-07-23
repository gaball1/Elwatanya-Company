export enum FinalBoqErrorCode {
  ITEM_NOT_FOUND = 'ITEM_NOT_FOUND',
  COMPONENT_NOT_FOUND = 'COMPONENT_NOT_FOUND',
  EMPLOYER_ITEM_NOT_FOUND = 'EMPLOYER_ITEM_NOT_FOUND',
  QUANTITY_BELOW_ALLOCATED = 'QUANTITY_BELOW_ALLOCATED',
  COMPONENT_QTY_EXCEEDS_ITEM = 'COMPONENT_QTY_EXCEEDS_ITEM',
  INVALID_DISTRIBUTION = 'INVALID_DISTRIBUTION',
}

export class FinalBoqApplicationError extends Error {
  constructor(
    public readonly code: FinalBoqErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'FinalBoqApplicationError';
  }
}
