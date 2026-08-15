import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFundTransactionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  fundId!: string;

  @ApiProperty({ example: 'add', enum: ['add', 'deduct', 'request', 'transfer'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['add', 'deduct', 'request', 'transfer'])
  type!: string;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0.01)
  @Max(999999999.99)
  amount!: number;

  @ApiPropertyOptional({ example: 'general', enum: ['general', 'purchase', 'miscellaneous', 'petty_cash', 'extract'] })
  @IsOptional()
  @IsString()
  @IsIn(['general', 'purchase', 'miscellaneous', 'petty_cash', 'extract'])
  category?: string;

  @ApiPropertyOptional({ example: 'دفعة مقدمة للمقاول' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: '2024-06-01' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: 'pending', enum: ['pending', 'approved', 'rejected'] })
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'approved', 'rejected'])
  status?: string;

  @ApiPropertyOptional({ example: 'INV-001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceId?: string;

  @ApiPropertyOptional({ example: 'ملاحظات المعاملة' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ example: 'أحمد محمود' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  createdBy?: string;
}

export class UpdateFundTransactionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsUUID()
  fundId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(['add', 'deduct', 'request', 'transfer'])
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(999999999.99)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(['general', 'purchase', 'miscellaneous', 'petty_cash', 'extract'])
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'approved', 'rejected'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  createdBy?: string;
}
