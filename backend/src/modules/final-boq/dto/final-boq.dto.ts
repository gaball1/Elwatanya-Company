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

export class AnalyzeComponentDto {
  @ApiProperty({ example: 'حديد' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'طن' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit!: string;

  @ApiProperty({ example: 1200 })
  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class AnalyzeFinalBoqItemDto {
  @ApiProperty({ type: [AnalyzeComponentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnalyzeComponentDto)
  components!: AnalyzeComponentDto[];
}

export class ImportFinalFromEmployerDto {
  @ApiProperty({ example: 'CONC-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  itemCode!: string;
}

export class UpdateFinalBoqItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateFinalItemQuantityDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

export class AddFinalBoqComponentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice!: number;
}

export class UpdateFinalBoqComponentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;
}
