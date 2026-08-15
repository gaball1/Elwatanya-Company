import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { handleError } from '../../common/utils/handle-error';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ListProjectBoardDocumentsUseCase } from './application/use-cases/list-project-board-documents.use-case';
import { CreateProjectBoardDocumentUseCase } from './application/use-cases/create-project-board-document.use-case';
import { UpdateProjectBoardDocumentUseCase } from './application/use-cases/update-project-board-document.use-case';
import { DeleteProjectBoardDocumentUseCase } from './application/use-cases/delete-project-board-document.use-case';
import { CreateProjectBoardDocumentDto, UpdateProjectBoardDocumentDto } from './dto/project-board-document.dto';

@ApiTags('Project Board Documents')
@ApiBearerAuth()
@Controller('project-board-documents')
export class ProjectBoardDocumentController {
  constructor(
    private readonly listDocuments: ListProjectBoardDocumentsUseCase,
    private readonly createDocument: CreateProjectBoardDocumentUseCase,
    private readonly updateDocument: UpdateProjectBoardDocumentUseCase,
    private readonly deleteDocument: DeleteProjectBoardDocumentUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List documents/drawings attached to a project board' })
  @ApiQuery({ name: 'boardId', required: false })
  @RequirePermission(Permissions.ProjectBoards.Read)
  async list(@Query('boardId') boardId?: string) {
    const result = await this.listDocuments.execute(boardId);
    return { items: result.getValue() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a board document by id' })
  @RequirePermission(Permissions.ProjectBoards.Read)
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.listDocuments.execute();
    const doc = result.getValue()?.find((d) => d.id === id);
    if (!doc) throw new NotFoundException('Board document not found');
    return { document: doc };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Attach a document/drawing to a project board' })
  @RequirePermission(Permissions.ProjectBoards.Create)
  async create(@Body() dto: CreateProjectBoardDocumentDto, @CurrentUser('sub') userId?: string) {
    const result = await this.createDocument.execute({
      boardId: dto.boardId,
      fileName: dto.fileName,
      fileId: dto.fileId,
      mimeType: dto.mimeType,
      fileSize: dto.fileSize,
      description: dto.description,
      uploadedBy: userId ?? dto.uploadedBy ?? null,
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to attach document');
    return { document: result.getValue() };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a board document metadata' })
  @RequirePermission(Permissions.ProjectBoards.Update)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProjectBoardDocumentDto) {
    const result = await this.updateDocument.execute({
      id,
      fileName: dto.fileName,
      fileId: dto.fileId,
      mimeType: dto.mimeType,
      fileSize: dto.fileSize,
      description: dto.description,
    });
    if (result.isFailure) handleError(result.error?.message, 'Failed to update document');
    return { document: result.getValue() };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a board document' })
  @RequirePermission(Permissions.ProjectBoards.Delete)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.deleteDocument.execute(id);
    if (result.isFailure) handleError(result.error?.message, 'Failed to delete document');
  }
}