import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FinalBoqStatus } from '../../domain/final-boq-status.enum';

export class ChangeStatusDto {
  @ApiProperty({ enum: FinalBoqStatus })
  @IsEnum(FinalBoqStatus)
  @IsNotEmpty()
  status: FinalBoqStatus;
}
