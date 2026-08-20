import { IsOptional, IsString, MinLength, IsNotEmpty } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../../common/validators/password.validator';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;
}

export class ChangePasswordDto {
  @ApiPropertyOptional()
  @IsString()
  currentPassword: string;

  @ApiPropertyOptional()
  @IsString()
  @IsStrongPassword()
  newPassword: string;
}

export class SaveSignatureDto {
  @ApiProperty({ description: 'Base64 data URL of signature image' })
  @IsString()
  @IsNotEmpty()
  signatureUrl: string;
}

export class SaveAvatarDto {
  @ApiProperty({ description: 'Base64 data URL of profile picture' })
  @IsString()
  @IsNotEmpty()
  avatarUrl: string;
}
