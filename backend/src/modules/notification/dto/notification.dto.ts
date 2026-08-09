import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
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
}
