export class ApiResponse<T = any> {
  public readonly success: boolean;
  public readonly data?: T;
  public readonly code?: string;
  public readonly message?: string;
  public readonly errors?: any[];
  public readonly timestamp: string;

  private constructor(success: boolean, data?: T, code?: string, message?: string, errors?: any[]) {
    this.success = success;
    this.data = data;
    this.code = code;
    this.message = message;
    this.errors = errors;
    this.timestamp = new Date().toISOString();
  }

  static ok<T>(data: T): ApiResponse<T> {
    return new ApiResponse(true, data);
  }

  static error(code: string, message: string, errors?: any[]): ApiResponse {
    return new ApiResponse(false, undefined, code, message, errors);
  }

  static validation(errors: any[]): ApiResponse {
    return new ApiResponse(false, undefined, 'VALIDATION_ERROR', 'Validation failed', errors);
  }

  static notFound(message?: string): ApiResponse {
    return new ApiResponse(false, undefined, 'NOT_FOUND', message ?? 'Resource not found');
  }

  static forbidden(message?: string): ApiResponse {
    return new ApiResponse(false, undefined, 'FORBIDDEN', message ?? 'Access denied');
  }

  static unauthorized(message?: string): ApiResponse {
    return new ApiResponse(false, undefined, 'UNAUTHORIZED', message ?? 'Unauthorized');
  }

  static conflict(message?: string): ApiResponse {
    return new ApiResponse(false, undefined, 'CONFLICT', message ?? 'Resource conflict');
  }

  static internal(message?: string): ApiResponse {
    return new ApiResponse(false, undefined, 'INTERNAL_ERROR', message ?? 'Internal server error');
  }
}
