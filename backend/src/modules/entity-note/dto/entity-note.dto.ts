import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEntityNoteDto {
  @ApiProperty({ example: 'project' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  entityType!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsNotEmpty()
  entityId!: string;

  @ApiProperty({ example: 'ملاحظة على العنصر' })
  @IsString()
  @IsNotEmpty()
  content!: string;
}

export class UpdateEntityNoteDto {
  @ApiProperty({ example: 'تم تحديث الملاحظة' })
  @IsString()
  @IsNotEmpty()
  content!: string;
}
