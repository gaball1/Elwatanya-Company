import { IsNotEmpty, IsString, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'PRJ-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, {
    message: 'code must be alphanumeric with optional hyphens/underscores',
  })
  code!: string;

  @ApiProperty({ example: 'Al Andalus Residential' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;
}
