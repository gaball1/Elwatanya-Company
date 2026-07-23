import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProjectDto {
  @ApiProperty({ example: 'Al Andalus Residential Phase 2' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;
}
