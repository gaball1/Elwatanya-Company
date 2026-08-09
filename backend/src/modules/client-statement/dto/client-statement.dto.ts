import { IsArray, IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientStatementDto {
  @ApiPropertyOptional({ example: 'CS-001' }) @IsOptional() @IsString() @MaxLength(50) statementNumber?: string;
  @ApiProperty({ example: 'project-uuid' }) @IsUUID() @IsString() projectId!: string;
  @ApiPropertyOptional({ example: 'مشروع الأندلس' }) @IsOptional() @IsString() @MaxLength(200) projectName?: string;
  @ApiPropertyOptional({ example: 'building-uuid' }) @IsOptional() @IsString() buildingId?: string;
  @ApiPropertyOptional({ example: 'العمارة A' }) @IsOptional() @IsString() @MaxLength(200) buildingName?: string;
  @ApiProperty({ example: 'client-uuid' }) @IsUUID() @IsString() clientId!: string;
  @ApiPropertyOptional({ example: 'شركة الأندلس' }) @IsOptional() @IsString() @MaxLength(200) clientName?: string;
  @ApiPropertyOptional({ example: '2024-06-01' }) @IsOptional() @IsDateString() date?: string;
  @ApiPropertyOptional({ example: 'pending', enum: ['pending', 'approved', 'rejected'] }) @IsOptional() @IsString() @IsIn(['pending', 'approved', 'rejected']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalWorkValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalDeductions?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() netPayable?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() items?: any[];
  @ApiPropertyOptional() @IsOptional() @IsArray() deductions?: any[];
  @ApiPropertyOptional() @IsOptional() @IsArray() signatures?: any[];
}

export class UpdateClientStatementDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) statementNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() @IsString() projectId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) projectName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() buildingId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) buildingName?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() @IsString() clientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) clientName?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @IsIn(['pending', 'approved', 'rejected']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalWorkValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() totalDeductions?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() netPayable?: number;
  @ApiPropertyOptional() @IsOptional() @IsArray() items?: any[];
  @ApiPropertyOptional() @IsOptional() @IsArray() deductions?: any[];
  @ApiPropertyOptional() @IsOptional() @IsArray() signatures?: any[];
}
