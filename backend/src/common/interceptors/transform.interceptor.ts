import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../response/api-response';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        // If the controller already returns an ApiResponse, pass through
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }
        return ApiResponse.ok(data);
      }),
    );
  }
}
