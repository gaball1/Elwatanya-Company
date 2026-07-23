import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AllocateContractorItemDto {
  @ApiProperty({ description: 'itemCode or itemCode|componentId' })
  @IsString()
  @IsNotEmpty()
  itemCodeOrComponent!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantity!: number;
}

export class UpdateContractorItemQuantityDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  componentId?: string;
}

export class SetContractorMetaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  workType!: string;
}
