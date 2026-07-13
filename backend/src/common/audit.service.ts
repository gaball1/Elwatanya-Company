// src/common/audit.service.ts
import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Simple audit helper that extracts user information from the request
 * and returns audit fields suitable for Prisma create/update calls.
 */
@Injectable()
export class AuditService {
  // In a real app this would probably read from a JWT or session
  getAuditFields(req: Request): any {
    const userId = (req as any).user?.id || 'system';
    return {
      createdBy: userId,
      updatedBy: userId,
    } as any;
  }
}
