import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class FinanceDefaultsDto {
  @ApiProperty({ required: false, default: 5 }) @IsOptional() @IsNumber() @Min(0) @Max(100) defaultInsurancePercent?: number;
  @ApiProperty({ required: false, default: 10 }) @IsOptional() @IsNumber() @Min(0) @Max(100) maxInsurancePercent?: number;
  @ApiProperty({ required: false, default: 0 }) @IsOptional() @IsNumber() @Min(0) taxRate?: number;
  @ApiProperty({ required: false, default: 2 }) @IsOptional() @IsNumber() @Min(0) @Max(6) decimalPlaces?: number;
}
