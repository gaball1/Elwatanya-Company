export enum ProjectErrorCode {
  INVALID_CODE = 'INVALID_CODE',
  INVALID_NAME = 'INVALID_NAME',
  CODE_ALREADY_EXISTS = 'CODE_ALREADY_EXISTS',
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_DELETED = 'ALREADY_DELETED',
}

export class ProjectApplicationError extends Error {
  constructor(
    public readonly code: ProjectErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ProjectApplicationError';
  }
}
