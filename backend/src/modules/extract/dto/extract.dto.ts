import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ExtractItemDto {
  @ApiProperty()
  @IsString()
  itemCode!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty()
  @IsString()
  unit!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  contractQuantity!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  previous!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  current!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  executionPercent!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

class ManualDeductionDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsNumber()
  amount!: number;

  @ApiProperty({ enum: ['manual'] })
  @IsString()
  type!: 'manual';
}

export class SaveExtractDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ enum: ['running', 'final'] })
  @IsEnum(['running', 'final'] as const)
  status!: 'running' | 'final';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  runningNumber?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  insurancePercent!: number;

  @ApiProperty()
  @IsDateString()
  date!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  previousPaid!: number;

  @ApiProperty({ type: [ExtractItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractItemDto)
  items!: ExtractItemDto[];

  @ApiPropertyOptional({ type: [ManualDeductionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualDeductionDto)
  manualDeductions?: ManualDeductionDto[];
}
