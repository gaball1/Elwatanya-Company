import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CONTRACT_STATUSES = [
  'draft',
  'active',
  'completed',
  'terminated',
  'cancelled',
] as const;

export class CreateSubcontractorContractDto {
  @ApiProperty({ example: '9a32ba3d-0017-41f3-a92b-5426ebe32e25' })
  @IsString()
  @IsNotEmpty()
  buildingId!: string;

  @ApiProperty({ example: '1e4848ef-041d-492e-b503-7c0899aaca44' })
  @IsString()
  @IsNotEmpty()
  subcontractorId!: string;

  @ApiPropertyOptional({ example: 'عقد أعمال الحديد والأعمدة' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @ApiPropertyOptional({ example: '2026-08-15' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2027-08-15' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 125000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalValue?: number;

  @ApiPropertyOptional({ example: ['الالتزام بجداول التسليم', 'مواد العزل على المقاول'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  terms?: string[];

  @ApiPropertyOptional({ example: 'ملاحظات إضافية' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ example: 'draft', enum: CONTRACT_STATUSES })
  @IsOptional()
  @IsString()
  @IsIn(CONTRACT_STATUSES)
  status?: string;
}

export class UpdateSubcontractorContractDto {
  @ApiPropertyOptional({ example: 'عقد أعمال الحديد والأعمدة' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @ApiPropertyOptional({ example: '2026-08-15' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2027-08-15' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 125000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalValue?: number;

  @ApiPropertyOptional({ example: ['الالتزام بجداول التسليم'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  terms?: string[];

  @ApiPropertyOptional({ example: 'ملاحظات إضافية' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ example: 'active', enum: CONTRACT_STATUSES })
  @IsOptional()
  @IsString()
  @IsIn(CONTRACT_STATUSES)
  status?: string;
}
