export enum AnalyticalBoqErrorCode {
  INVALID_ITEM = 'INVALID_ITEM',
  BUILDING_NOT_FOUND = 'BUILDING_NOT_FOUND',
  ITEM_NOT_FOUND = 'ITEM_NOT_FOUND',
  EMPLOYER_ITEM_NOT_FOUND = 'EMPLOYER_ITEM_NOT_FOUND',
  DUPLICATE_ITEM_CODE = 'DUPLICATE_ITEM_CODE',
  ALREADY_IMPORTED = 'ALREADY_IMPORTED',
  QUANTITY_CANNOT_DECREASE = 'QUANTITY_CANNOT_DECREASE',
}

export class AnalyticalBoqApplicationError extends Error {
  constructor(
    public readonly code: AnalyticalBoqErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AnalyticalBoqApplicationError';
  }
}
