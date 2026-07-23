export enum BuildingErrorCode {
  INVALID_NAME = 'INVALID_NAME',
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  NOT_FOUND = 'NOT_FOUND',
  NAME_ALREADY_EXISTS = 'NAME_ALREADY_EXISTS',
  ALREADY_DELETED = 'ALREADY_DELETED',
}

export class BuildingApplicationError extends Error {
  constructor(
    public readonly code: BuildingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'BuildingApplicationError';
  }
}
