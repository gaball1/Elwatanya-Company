import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateSettingDto {
  @ApiProperty({ description: 'Setting value' })
  value: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateSettingGroupDto {
  @ApiProperty({ description: 'Key-value pairs of settings to update' })
  values: Record<string, any>;
}
