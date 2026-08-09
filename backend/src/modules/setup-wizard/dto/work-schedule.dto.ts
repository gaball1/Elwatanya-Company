import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class WorkScheduleDto {
  @ApiProperty({ required: false, default: '08:00' }) @IsOptional() @IsString() checkInTime?: string;
  @ApiProperty({ required: false, default: '17:00' }) @IsOptional() @IsString() checkOutTime?: string;
  @ApiProperty({ required: false, default: true }) @IsOptional() @IsBoolean() overtimeEnabled?: boolean;
  @ApiProperty({ required: false, default: 'Africa/Cairo' }) @IsOptional() @IsString() timezone?: string;
}
