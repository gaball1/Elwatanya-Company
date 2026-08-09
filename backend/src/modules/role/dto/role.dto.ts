import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'مهندس موقع' })
  @IsString() @IsNotEmpty() @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'مهندس مسؤول عن متابعة الموقع' })
  @IsOptional() @IsString() @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: ['employees.read', 'employees.write'] })
  @IsOptional() @IsArray() @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({ example: 'active', enum: ['active', 'inactive'] })
  @IsOptional() @IsString() @IsIn(['active', 'inactive'])
  status?: string;
}

export class UpdateRoleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200)
  name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
  description?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true })
  permissions?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() @IsIn(['active', 'inactive'])
  status?: string;
}
