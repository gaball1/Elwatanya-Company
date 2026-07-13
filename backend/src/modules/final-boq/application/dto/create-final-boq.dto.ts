// src/modules/final-boq/application/dto/create-final-boq.dto.ts

import { IsUUID, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for creating a Final BOQ.
 * The businessCode is immutable and must be unique within the project.
 */
export class CreateFinalBoqDto {
  @ApiProperty({ description: 'Project the BOQ belongs to' })
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({ description: 'Building the BOQ belongs to' })
  @IsUUID()
  @IsNotEmpty()
  buildingId: string;

  @ApiProperty({ description: 'Immutable business code for the BOQ' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  businessCode: string;

  @ApiProperty({ description: 'Optional friendly name for UI display' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
