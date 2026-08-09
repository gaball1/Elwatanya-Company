import { IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAttendanceDto {
  @ApiProperty({ example: 'uuid-of-employee' })
  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: '2024-01-15T08:00:00Z' })
  @IsDateString()
  checkInTime!: string;

  @ApiPropertyOptional({ example: 30.0444 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  checkInLatitude?: number;

  @ApiPropertyOptional({ example: 31.2357 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  checkInLongitude?: number;

  @ApiPropertyOptional({ example: 'Cairo, Egypt' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  checkInAddress?: string;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  checkInAccuracy?: number;

  @ApiPropertyOptional({ example: 'data:image/jpeg;base64,...' })
  @IsOptional()
  @IsString()
  checkInSelfie?: string;

  @ApiPropertyOptional({ example: '{"browser":"Chrome","os":"Windows"}' })
  @IsOptional()
  @IsString()
  deviceInfo?: string;

  @ApiPropertyOptional({ example: 38 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  distanceFromSite?: number;

  @ApiPropertyOptional({ example: 'uuid-of-project' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-building' })
  @IsOptional()
  @IsString()
  buildingId?: string;

  @ApiPropertyOptional({ example: 'Arrived on time' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CheckOutDto {
  @ApiProperty({ example: '2024-01-15T17:00:00Z' })
  @IsDateString()
  checkOutTime!: string;

  @ApiPropertyOptional({ example: 30.0445 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  checkOutLatitude?: number;

  @ApiPropertyOptional({ example: 31.2358 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  checkOutLongitude?: number;

  @ApiPropertyOptional({ example: 'Cairo, Egypt' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  checkOutAddress?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  checkOutAccuracy?: number;

  @ApiPropertyOptional({ example: 'data:image/jpeg;base64,...' })
  @IsOptional()
  @IsString()
  checkOutSelfie?: string;

  @ApiPropertyOptional({ example: 38 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  distanceFromSite?: number;

  @ApiPropertyOptional({ example: 'Left on time' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateAttendanceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checkIn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checkOut?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsIn(['present', 'absent', 'late', 'holiday'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  hoursWorked?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
