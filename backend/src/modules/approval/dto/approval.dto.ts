import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

const ENTITY_TYPES = ['extract', 'purchase', 'leave', 'fund-transaction', 'client-statement', 'subcontractor-statement', 'inventory', 'estimate', 'boq'];
const APPROVAL_STATUSES = ['draft', 'pending', 'approved', 'rejected', 'cancelled'];

export class RequestApprovalDto {
  @ApiProperty({ enum: ENTITY_TYPES })
  @IsString()
  @IsIn(ENTITY_TYPES)
  entityType: string;

  @ApiProperty()
  @IsString()
  entityId: string;

  @ApiPropertyOptional({ enum: ['draft', 'pending'], default: 'pending' })
  @IsOptional()
  @IsString()
  @IsIn(['draft', 'pending'])
  status?: 'draft' | 'pending';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class ApproveOrRejectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class ListApprovalsQueryDto {
  @ApiPropertyOptional({ enum: APPROVAL_STATUSES })
  @IsOptional()
  @IsString()
  @IsIn(APPROVAL_STATUSES)
  status?: string;

  @ApiPropertyOptional({ enum: ENTITY_TYPES })
  @IsOptional()
  @IsString()
  @IsIn(ENTITY_TYPES)
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  skip?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  take?: string;
}
