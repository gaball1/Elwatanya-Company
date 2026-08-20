import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class WorkflowStepDto {
  @ApiProperty({ example: 'Manager Approval' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  label!: string;

  @ApiPropertyOptional({ example: 'project_manager' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  roleName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isFinal?: boolean;
}

export class CreateWorkflowDto {
  @ApiProperty({ example: 'Contract Approval Workflow' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ example: 'Standard multi-step contract approval' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: 'contract' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  entityType!: string;

  @ApiProperty({ type: [WorkflowStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps!: WorkflowStepDto[];
}

export class UpdateWorkflowDto {
  @ApiPropertyOptional({ example: 'Updated Workflow Name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
