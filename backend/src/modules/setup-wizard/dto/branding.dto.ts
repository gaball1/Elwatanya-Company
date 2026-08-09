import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class BrandingDto {
  @ApiProperty({ required: false, default: '#1e40af' }) @IsOptional() @IsString() primaryColor?: string;
  @ApiProperty({ required: false, default: '#64748b' }) @IsOptional() @IsString() secondaryColor?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() logoUrl?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() faviconUrl?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() watermark?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() qrCodeUrl?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() stampUrl?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() digitalStampUrl?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() signatureUrl?: string;
}
