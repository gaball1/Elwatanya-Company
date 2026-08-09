import { IsArray, IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubcontractorStatementDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) statementNumber?: string;
  @ApiProperty() @IsUUID() projectId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) projectName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() buildingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) buildingName?: string;
  @ApiProperty() @IsUUID() @IsString() subcontractorId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) subcontractorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) workType?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() date?: string;
  @ApiPropertyOptional({ enum: ['pending', 'approved', 'rejected'] }) @IsOptional() @IsString() @IsIn(['pending', 'approved', 'rejected']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) blockNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) formNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() insurancePercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalWorkValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalInsurance?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalDeductions?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() previousPaid?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() netPayable?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() runningNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() items?: any[];
  @ApiPropertyOptional() @IsOptional() @IsArray() deductions?: any[];
  @ApiPropertyOptional() @IsOptional() @IsArray() signatures?: any[];
}

export class UpdateSubcontractorStatementDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) statementNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) projectName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() buildingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) buildingName?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() subcontractorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) subcontractorName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() workType?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @IsIn(['pending', 'approved', 'rejected']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() blockNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() formNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() insurancePercent?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalWorkValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalInsurance?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalDeductions?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() previousPaid?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() netPayable?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() runningNumber?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() items?: any[];
  @ApiPropertyOptional() @IsOptional() @IsArray() deductions?: any[];
  @ApiPropertyOptional() @IsOptional() @IsArray() signatures?: any[];
}
