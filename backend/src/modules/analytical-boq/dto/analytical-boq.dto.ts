import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnalyticalBoqItemDto {
  @ApiProperty({ example: 'CONC-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  itemCode!: string;

  @ApiProperty({ example: 'Concrete works' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  @ApiProperty({ example: 'م³' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit!: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  quantity!: number;

  @ApiProperty({ example: 1200 })
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiProperty({ example: 120000 })
  @IsNumber()
  @Min(0)
  totalValue!: number;
}

export class SetAnalyticalBoqItemsDto {
  @ApiProperty({ type: [AnalyticalBoqItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnalyticalBoqItemDto)
  items!: AnalyticalBoqItemDto[];
}

export class UpdateAnalyticalBoqItemDto {
  @ApiPropertyOptional({ example: 'Concrete works' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ example: 1200 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

export class ImportAnalyticalFromEmployerDto {
  @ApiProperty({ example: 'CONC-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  itemCode!: string;
}
