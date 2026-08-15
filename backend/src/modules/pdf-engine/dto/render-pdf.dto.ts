import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export const MAX_PDF_SECTIONS = 200;
export const MAX_SECTION_CONTENT_LENGTH = 100_000;
export const MAX_PDF_TITLE_LENGTH = 300;
export const MAX_PDF_JSON_SIZE_BYTES = 512 * 1024; // 512 KB

export class RenderPdfSectionDto {
  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @ApiProperty({ maxLength: MAX_SECTION_CONTENT_LENGTH })
  @IsString()
  @MaxLength(MAX_SECTION_CONTENT_LENGTH)
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  columns?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  breakInside?: boolean;
}

export class RenderPdfSignatureDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @MaxLength(200)
  label: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  date?: string;
}

export class RenderPdfDto {
  @ApiProperty({ maxLength: MAX_PDF_TITLE_LENGTH })
  @IsString()
  @Length(1, MAX_PDF_TITLE_LENGTH)
  title: string;

  @ApiPropertyOptional({ maxLength: MAX_PDF_TITLE_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_PDF_TITLE_LENGTH)
  arabicTitle?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentNumber?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  version?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  generatedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  generatedAt?: string;

  @ApiPropertyOptional({ type: [RenderPdfSectionDto], maxItems: MAX_PDF_SECTIONS })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_PDF_SECTIONS)
  @ValidateNested({ each: true })
  @Type(() => RenderPdfSectionDto)
  sections?: RenderPdfSectionDto[];

  @ApiPropertyOptional({ type: [RenderPdfSignatureDto], maxItems: 20 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => RenderPdfSignatureDto)
  signatures?: RenderPdfSignatureDto[];

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  watermark?: string;

  @ApiPropertyOptional({ enum: ['portrait', 'landscape'] })
  @IsOptional()
  @IsIn(['portrait', 'landscape'])
  orientation?: 'portrait' | 'landscape';

  @ApiPropertyOptional({ enum: ['A4', 'A3', 'Letter'] })
  @IsOptional()
  @IsIn(['A4', 'A3', 'Letter'])
  pageSize?: 'A4' | 'A3' | 'Letter';

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  qrData?: string;

  @ApiPropertyOptional({ enum: ['ar', 'en'] })
  @IsOptional()
  @IsIn(['ar', 'en'])
  locale?: 'ar' | 'en';

  @ApiPropertyOptional({ maxLength: 500, description: 'Company asset URL or /api/v1/files/public/:id path' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^(data:image\/(png|jpeg|gif|webp);base64,|https?:\/\/|\/[^/])/)
  logoUrl?: string;
}
