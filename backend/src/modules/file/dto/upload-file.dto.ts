import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { ALLOWED_FILE_CATEGORIES } from '../domain/file-security.constants';

export class UploadFileDto {
  @ApiProperty({ description: 'File category', enum: ALLOWED_FILE_CATEGORIES })
  @IsIn(ALLOWED_FILE_CATEGORIES as unknown as string[])
  category: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  metadata?: Record<string, any>;
}
