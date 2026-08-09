import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const LEAVE_TYPES = ['annual', 'sick', 'emergency', 'unpaid'] as const;
const LEAVE_STATUSES = ['pending', 'approved', 'rejected'] as const;

export class CreateLeaveDto {
  @ApiProperty({ example: 'uuid-employee-id' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  employeeId!: string;

  @ApiPropertyOptional({ example: 'annual', enum: LEAVE_TYPES })
  @IsOptional()
  @IsString()
  @IsIn(LEAVE_TYPES)
  leaveType?: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2024-01-20' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @IsInt()
  @Min(1)
  daysCount?: number;

  @ApiPropertyOptional({ example: 'إجازة سنوية' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({ example: 'pending', enum: LEAVE_STATUSES })
  @IsOptional()
  @IsString()
  @IsIn(LEAVE_STATUSES)
  status?: string;

  @ApiPropertyOptional({ example: 'uuid-manager-id' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  approvedBy?: string;
}

export class UpdateLeaveDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(LEAVE_TYPES)
  leaveType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  daysCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(LEAVE_STATUSES)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  approvedBy?: string;
}
