import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { IsStrongPassword } from '../../../common/validators/password.validator';

export class CreateAdminDto {
  @ApiProperty() @IsString() @MinLength(1) name: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @IsStrongPassword() password: string;
  @ApiProperty({ required: false }) @IsString() phone?: string;
}
