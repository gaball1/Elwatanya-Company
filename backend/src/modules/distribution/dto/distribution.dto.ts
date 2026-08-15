import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DistributionEntryDto {
  @ApiProperty()
  @IsUUID()
  contractorId!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantity!: number;
}

export class DistributeComponentDto {
  @ApiProperty({ type: [DistributionEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DistributionEntryDto)
  distribution!: DistributionEntryDto[];
}

export class DistributeItemDto {
  @ApiProperty({ type: [DistributionEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DistributionEntryDto)
  distribution!: DistributionEntryDto[];
}
