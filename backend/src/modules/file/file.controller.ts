import { Controller, Get, Post, Delete, Param, Query, UploadedFile, UseInterceptors, BadRequestException, Res, UseGuards, ForbiddenException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { FileService } from './file.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/auth.decorators';
import { Permissions } from '../../common/constants/permissions.constant';
import { buildContentDisposition } from '../../common/pdf-header.util';

@ApiTags('Files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @RequirePermission(Permissions.Files.Upload)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: any,
    @Query('category') category: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    if (!category) throw new BadRequestException('Category is required');

    const result = await this.fileService.upload(file.buffer, {
      category,
      fileName: file.originalname,
      mimeType: file.mimetype,
      entityType,
      entityId,
    });
    return result;
  }

  @Post('upload-base64')
  @ApiOperation({ summary: 'Upload a file from base64 string' })
  @RequirePermission(Permissions.Files.Upload)
  async uploadBase64(
    @Query('category') category: string,
    @Query('fileName') fileName: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    // Expect base64 in request body
    return { message: 'Send base64 data in POST body to /files/upload' };
  }

  @Get('download/:id')
  @ApiOperation({ summary: 'Download a file by ID' })
  @RequirePermission(Permissions.Files.Read)
  async download(@Param('id') id: string, @Res() res: Response) {
    const { stream, mimeType, fileName } = await this.fileService.getFileStream(id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', buildContentDisposition(fileName, 'inline'));
    stream.pipe(res);
  }

  @Public()
  @Get('public/:id')
  @ApiOperation({ summary: 'Download a company branding asset without authentication (logo, stamp, watermark, signature)' })
  async downloadPublicCompanyAsset(@Param('id') id: string, @Res() res: Response) {
    const file = await this.fileService.getFile(id);
    if (file.category !== 'company') {
      throw new ForbiddenException('This file is not a public company asset');
    }
    const { stream, mimeType, fileName } = await this.fileService.getFileStream(id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', buildContentDisposition(fileName, 'inline'));
    res.setHeader('Cache-Control', 'public, max-age=86400');
    stream.pipe(res);
  }

  @Get()
  @ApiOperation({ summary: 'List files by category or entity' })
  @RequirePermission(Permissions.Files.Read)
  async list(
    @Query('category') category?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    if (category) {
      return { files: await this.fileService.listByCategory(category) };
    }
    if (entityType && entityId) {
      return { files: await this.fileService.listByEntity(entityType, entityId) };
    }
    return { files: [] };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a file' })
  @RequirePermission(Permissions.Files.Delete)
  async delete(@Param('id') id: string) {
    await this.fileService.deleteFile(id);
    return { deleted: true };
  }
}
