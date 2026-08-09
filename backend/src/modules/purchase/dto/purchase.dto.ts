import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePurchaseDto {
  @ApiProperty({ example: 'b1a2c3d4-...' })
  @IsUUID()
  @IsNotEmpty()
  projectId!: string;

  @ApiPropertyOptional({ example: 'b1a2c3d4-...' })
  @IsOptional()
  @IsUUID()
  buildingId?: string;

  @ApiPropertyOptional({ example: 'b1a2c3d4-...' })
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiProperty({ example: 'أسمنت بورتلاندى' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  itemName!: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @ApiProperty({ example: 'كيس' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit!: string;

  @ApiProperty({ example: 85.50 })
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiProperty({ example: '2024-06-15' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ example: 'فاتورة رقم 123' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ example: 'data:application/pdf;base64,...' })
  @IsOptional()
  @IsString()
  invoiceFile?: string;

  @ApiPropertyOptional({ example: 'شركة المواد الممتازة' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  supplierName?: string;

  @ApiProperty({ example: 'a1b2c3d4-...' })
  @IsUUID()
  @IsNotEmpty()
  createdBy!: string;

  @ApiPropertyOptional({ example: 'c1d2e3f4-...' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'i1a2b3c4-...' })
  @IsOptional()
  @IsUUID()
  inventoryItemId?: string;
}

export class UpdatePurchaseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  itemName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceFile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  supplierName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  buildingId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  createdBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  inventoryItemId?: string;
}

export class UpdatePurchaseStatusDto {
  @ApiProperty({ example: 'approved', enum: ['approved', 'received', 'cancelled'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['approved', 'received', 'cancelled'])
  status!: 'approved' | 'received' | 'cancelled';
}
