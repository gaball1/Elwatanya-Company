import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { EntityNoteService } from './entity-note.service';
import { CreateEntityNoteDto, UpdateEntityNoteDto } from './dto/entity-note.dto';

@ApiTags('Entity Notes')
@ApiBearerAuth()
@Controller('entity-notes')
export class EntityNoteController {
  constructor(private readonly entityNoteService: EntityNoteService) {}

  @Get()
  @ApiOperation({ summary: 'List notes for an entity' })
  @RequirePermission(Permissions.Settings.Read)
  @ApiQuery({ name: 'entityType', required: true, type: String })
  @ApiQuery({ name: 'entityId', required: true, type: String })
  async list(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    const notes = await this.entityNoteService.list(entityType, entityId);
    return { items: notes };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a note on an entity' })
  @RequirePermission(Permissions.Settings.Write)
  async create(
    @Body() dto: CreateEntityNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const note = await this.entityNoteService.create(user.sub, dto);
    return { note };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a note' })
  @RequirePermission(Permissions.Settings.Write)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEntityNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const note = await this.entityNoteService.update(id, user.sub, dto.content);
    return { note };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a note' })
  @RequirePermission(Permissions.Settings.Write)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.entityNoteService.delete(id, user);
  }
}
