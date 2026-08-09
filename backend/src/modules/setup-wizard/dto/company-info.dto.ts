import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CompanyInfoDto {
  @ApiProperty() @IsString() @MinLength(1) name: string;
  @ApiProperty() @IsString() @MinLength(1) arabicName: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() logo?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() favicon?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() address?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() phone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail() email?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() taxNumber?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() commercialRegister?: string;
  @ApiProperty({ required: false, default: 'EGP' }) @IsOptional() @IsString() currency?: string;
  @ApiProperty({ required: false, default: 'DD/MM/YYYY' }) @IsOptional() @IsString() dateFormat?: string;
  @ApiProperty({ required: false, default: 'ar' }) @IsOptional() @IsString() language?: string;
  @ApiProperty({ required: false, default: 'Africa/Cairo' }) @IsOptional() @IsString() timeZone?: string;
}
