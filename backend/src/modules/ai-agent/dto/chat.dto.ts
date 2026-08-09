import { IsOptional, IsString, IsUUID } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @IsOptional()
  context?: {
    projectId?: string;
    buildingId?: string;
    subcontractorId?: string;
    employeeId?: string;
  };
}
