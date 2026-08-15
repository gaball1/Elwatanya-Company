import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStockMovementDto {
  @ApiProperty({ example: 'uuid-item-id' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  itemId!: string;

  @ApiProperty({ example: 'ISSUE', enum: ['ISSUE', 'RECEIVE', 'TRANSFER'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['ISSUE', 'RECEIVE', 'TRANSFER'])
  type!: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  quantity!: number;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 'REF-001' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reference?: string;

  @ApiPropertyOptional({ example: 'سبب العملية (توريد/صرف/زيادة)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  @ApiPropertyOptional({ example: 'Stock movement notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ example: 'user-uuid' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  createdBy?: string;

  @ApiPropertyOptional({ example: 'issued-to-uuid' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  issuedTo?: string;

  @ApiPropertyOptional({ example: 'supplier-uuid' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  supplier?: string;

  @ApiPropertyOptional({ example: 'warehouse-uuid' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fromWarehouse?: string;

  @ApiPropertyOptional({ example: 'warehouse-uuid' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  toWarehouse?: string;
}

export class UpdateStockMovementDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  itemId?: string;

  @ApiPropertyOptional({ enum: ['ISSUE', 'RECEIVE', 'TRANSFER'] })
  @IsOptional()
  @IsString()
  @IsIn(['ISSUE', 'RECEIVE', 'TRANSFER'])
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  createdBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  issuedTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  supplier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fromWarehouse?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  toWarehouse?: string;
}
