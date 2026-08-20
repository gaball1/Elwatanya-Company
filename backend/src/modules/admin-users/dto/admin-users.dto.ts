import { IsArray, IsEmail, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsStrongPassword } from '../../../common/validators/password.validator';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  name: string;

  @ApiProperty()
  @IsString()
  @IsStrongPassword()
  password: string;

  @ApiPropertyOptional({ description: 'Optional employee record to link to this account' })
  @IsOptional()
  @IsString()
  @IsUUID()
  employeeId?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Employee record to link to this account. Pass null/empty to unlink.' })
  @IsOptional()
  @IsString()
  employeeId?: string | null;
}

export class AssignRolesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  roleIds: string[];
}

export class AssignProjectsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  projectIds: string[];
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsStrongPassword()
  newPassword: string;
}

export class QueryUsersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string;
}
