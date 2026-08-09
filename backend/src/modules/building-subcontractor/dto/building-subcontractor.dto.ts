import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignSubcontractorDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsString()
  subcontractorId!: string;

  @ApiPropertyOptional({ example: 'حديد' })
  @IsOptional()
  @IsString()
  workType?: string;

  @ApiPropertyOptional({ example: 500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  agreedPrice?: number;
}

export class BuildingSubcontractorResponseDto {
  id!: string;
  buildingId!: string;
  subcontractorId!: string;
  workType!: string;
  agreedPrice?: number;
  status!: string;
  assignedAt!: Date;
  subcontractor?: {
    id: string;
    name: string;
    workType: string;
    phone: string;
    email: string;
  };
}
