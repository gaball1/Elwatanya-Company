import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ example: 'تم إضافة مشروع جديد' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title!: string;

  @ApiPropertyOptional({ example: 'New project added' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  titleEn?: string;

  @ApiProperty({ example: 'تم إضافة مشروع جديد إلى النظام' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message!: string;

  @ApiPropertyOptional({ example: 'New project has been added to the system' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  messageEn?: string;

  @ApiPropertyOptional({ example: 'info', enum: ['info', 'warning', 'error'] })
  @IsOptional()
  @IsString()
  @IsIn(['info', 'warning', 'error'])
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ example: 'project' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ example: '/projects/123' })
  @IsOptional()
  @IsString()
  link?: string;

  @ApiPropertyOptional({
    description: 'Role names this notification is dedicated to (broadcast when no userId). Empty = everyone.',
    example: ['TECHNICAL_OFFICE'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  targetRoles?: string[];

  @ApiPropertyOptional({
    description: 'Permission names this notification is dedicated to (broadcast when no userId). Empty = everyone.',
    example: ['approvals.approve'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(150, { each: true })
  targetPermissions?: string[];
}

export class ListNotificationsQueryDto {
  @ApiPropertyOptional({ enum: ['info', 'warning', 'error'] })
  @IsOptional()
  @IsString()
  @IsIn(['info', 'warning', 'error'])
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  read?: boolean;

  @ApiPropertyOptional({ description: 'Maximum number of notifications to return' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
