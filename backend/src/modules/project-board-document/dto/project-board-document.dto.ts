import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectBoardDocumentDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  @IsUUID()
  @IsNotEmpty()
  boardId!: string;

  @ApiProperty({ example: 'drawing-2024-A1.pdf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  fileName!: string;

  @ApiPropertyOptional({ example: 'file-record-id' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fileId?: string;

  @ApiPropertyOptional({ example: 'application/pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  mimeType?: string;

  @ApiPropertyOptional({ example: 245760 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  fileSize?: number;

  @ApiPropertyOptional({ example: 'لوحة صب الخرسانة - الدور الأرضي' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  uploadedBy?: string;
}

export class UpdateProjectBoardDocumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  fileName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fileId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  mimeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  fileSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}