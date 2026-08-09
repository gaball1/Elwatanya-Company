import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ConversationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}

export class UpdateConversationDto {
  @ApiPropertyOptional({ example: 'Project costs discussion' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}

export class ConversationIdParamDto {
  @IsUUID()
  id!: string;
}
