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

export class CreateMiscellaneousDto {
  @ApiProperty({ example: 'b1a2c3d4-...' })
  @IsUUID()
  @IsNotEmpty()
  projectId!: string;

  @ApiProperty({ example: 'نقل مواد بناء' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  @ApiProperty({ example: 1500.00 })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({ example: 'transport', enum: ['food', 'transport', 'tools', 'other'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['food', 'transport', 'tools', 'other'])
  category!: 'food' | 'transport' | 'tools' | 'other';

  @ApiProperty({ example: '2024-06-15' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ example: 'فاتورة رقم 123' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({ example: 'a1b2c3d4-...' })
  @IsUUID()
  @IsNotEmpty()
  createdBy!: string;
}

export class UpdateMiscellaneousDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(['food', 'transport', 'tools', 'other'])
  category?: 'food' | 'transport' | 'tools' | 'other';

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
