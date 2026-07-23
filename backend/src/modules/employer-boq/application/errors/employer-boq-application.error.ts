export enum EmployerBoqErrorCode {
  INVALID_ITEM = 'INVALID_ITEM',
  BUILDING_NOT_FOUND = 'BUILDING_NOT_FOUND',
  ITEM_NOT_FOUND = 'ITEM_NOT_FOUND',
  DUPLICATE_ITEM_CODE = 'DUPLICATE_ITEM_CODE',
}

export class EmployerBoqApplicationError extends Error {
  constructor(
    public readonly code: EmployerBoqErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'EmployerBoqApplicationError';
  }
}
