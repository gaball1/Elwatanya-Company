import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { AuditService } from '../../modules/audit/audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = request;
    const user = request.user as any;

    if (!user || method === 'GET') {
      return next.handle();
    }

    const entity = this.extractEntity(url);
    const entityId = this.extractEntityId(url);
    const action = this.mapMethodToAction(method);

    return next.handle().pipe(
      tap(() => {
        if (entity && user?.sub) {
          this.audit.log({
            userId: user.sub,
            action,
            entity,
            entityId: entityId ?? 'unknown',
            ip,
          }).catch(() => {});
        }
      }),
    );
  }

  private extractEntity(url: string): string | null {
    const match = url.match(/\/api\/v1\/([a-z-]+)/);
    return match ? match[1] : null;
  }

  private extractEntityId(url: string): string | null {
    const parts = url.split('/').filter(Boolean);
    // Find UUID-like segments after entity name
    for (let i = 0; i < parts.length - 1; i++) {
      if (parts[i].match(/^[a-z-]+$/) && parts[i + 1]?.match(/^[0-9a-f-]{36}$/)) {
        return parts[i + 1];
      }
    }
    return null;
  }

  private mapMethodToAction(method: string): string {
    switch (method) {
      case 'POST': return 'CREATE';
      case 'PATCH':
      case 'PUT': return 'UPDATE';
      case 'DELETE': return 'DELETE';
      default: return method;
    }
  }
}
