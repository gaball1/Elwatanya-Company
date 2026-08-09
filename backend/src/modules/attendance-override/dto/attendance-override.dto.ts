import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOverrideDto {
  @ApiPropertyOptional({ example: 'uuid-of-attendance' })
  @IsOptional()
  @IsString()
  @IsUUID()
  attendanceId?: string;

  @ApiProperty({ example: 'uuid-of-requesting-user' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  requestedBy!: string;

  @ApiProperty({ example: 'Site equipment maintenance outside the allowed radius' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;

  @ApiPropertyOptional({ example: 'check_in', enum: ['check_in', 'check_out'] })
  @IsOptional()
  @IsIn(['check_in', 'check_out'])
  type?: 'check_in' | 'check_out';

  @ApiPropertyOptional({ example: 380 })
  @IsOptional()
  distance?: number;

  @ApiPropertyOptional({
    description: 'Snapshot of the original check-in/check-out request for attendance materialization',
  })
  @IsOptional()
  @IsObject()
  snapshot?: any;
}

export class ApproveRejectDto {
  @ApiPropertyOptional({ example: 'Approved - legitimate maintenance work' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}