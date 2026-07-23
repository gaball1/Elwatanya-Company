import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBuildingDto {
  @ApiProperty({ example: 'Building A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;
}

export class UpdateBuildingDto {
  @ApiProperty({ example: 'Building A - Tower 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;
}

export class ProjectIdParamDto {
  @ApiProperty()
  @IsUUID()
  projectId!: string;
}
