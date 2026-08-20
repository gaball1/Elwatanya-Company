import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const CHANGE_ORDER_STATUSES = ['draft', 'pending', 'approved', 'rejected'] as const;

export class CreateChangeOrderDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @ApiProperty({ example: 'Increase concrete volume for foundation' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: 'Additional concrete required due to soil conditions' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Unexpected ground conditions' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  changeAmount!: number;
}

export class UpdateChangeOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  changeAmount?: number;

  @ApiPropertyOptional({ enum: CHANGE_ORDER_STATUSES })
  @IsOptional()
  @IsString()
  @IsIn(CHANGE_ORDER_STATUSES)
  status?: string;
}

export class RejectChangeOrderDto {
  @ApiPropertyOptional({ example: 'Does not align with project scope' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
