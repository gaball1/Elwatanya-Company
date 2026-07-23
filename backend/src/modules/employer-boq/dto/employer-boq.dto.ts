import { Type } from 'class-transformer';
import {
  ArrayMinSize,
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

export class EmployerBoqItemDto {
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

  @ApiProperty({ example: 1500 })
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiProperty({ example: 150000 })
  @IsNumber()
  @Min(0)
  totalValue!: number;
}

export class UpsertEmployerBoqItemDto {
  @ApiPropertyOptional({ example: 'CONC-001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  itemCode?: string;

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

  @ApiProperty({ example: 1500 })
  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class SetEmployerBoqItemsDto {
  @ApiProperty({ type: [EmployerBoqItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmployerBoqItemDto)
  items!: EmployerBoqItemDto[];
}
