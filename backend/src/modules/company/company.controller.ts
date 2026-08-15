import { Controller, Get, Put, Post, Body, Param, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { UpdateCompanyDto, UploadLogoDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { Permissions } from '../../common/constants/permissions.constant';
import { FileService } from '../file/file.service';
import { MAX_FILE_SIZE_BYTES } from '../file/domain/file-security.constants';

@ApiTags('Company')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('company')
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly fileService: FileService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get company settings' })
  @RequirePermission(Permissions.Company.Read)
  async get() {
    return { company: await this.companyService.get() };
  }

  @Put()
  @ApiOperation({ summary: 'Update company settings' })
  @RequirePermission(Permissions.Company.Write)
  async update(@Body() dto: UpdateCompanyDto) {
    return { company: await this.companyService.update(dto) };
  }

  @Post('upload/logo')
  @ApiOperation({ summary: 'Upload company logo' })
  @ApiConsumes('multipart/form-data')
  @RequirePermission(Permissions.Company.Write)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
    }),
  )
  async uploadLogo(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('File is required');
    const uploaded = await this.fileService.upload(file.buffer, {
      category: 'company',
      fileName: file.originalname,
      mimeType: file.mimetype,
      entityType: 'company',
    });
    return { company: await this.companyService.uploadLogo(uploaded.url) };
  }

  @Post('upload/small-logo')
  @ApiOperation({ summary: 'Upload small company logo' })
  @ApiConsumes('multipart/form-data')
  @RequirePermission(Permissions.Company.Write)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
    }),
  )
  async uploadSmallLogo(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('File is required');
    const uploaded = await this.fileService.upload(file.buffer, {
      category: 'company',
      fileName: file.originalname,
      mimeType: file.mimetype,
      entityType: 'company',
    });
    return { company: await this.companyService.uploadSmallLogo(uploaded.url) };
  }

  @Post('upload/watermark')
  @ApiOperation({ summary: 'Upload watermark image' })
  @ApiConsumes('multipart/form-data')
  @RequirePermission(Permissions.Company.Write)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
    }),
  )
  async uploadWatermark(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('File is required');
    const uploaded = await this.fileService.upload(file.buffer, {
      category: 'company',
      fileName: file.originalname,
      mimeType: file.mimetype,
      entityType: 'company',
    });
    return { company: await this.companyService.uploadWatermark(uploaded.url) };
  }

  @Post('upload/stamp')
  @ApiOperation({ summary: 'Upload company stamp' })
  @ApiConsumes('multipart/form-data')
  @RequirePermission(Permissions.Company.Write)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
    }),
  )
  async uploadStamp(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('File is required');
    const uploaded = await this.fileService.upload(file.buffer, {
      category: 'company',
      fileName: file.originalname,
      mimeType: file.mimetype,
      entityType: 'company',
    });
    return { company: await this.companyService.uploadStamp(uploaded.url) };
  }

  @Post('upload/signature')
  @ApiOperation({ summary: 'Upload company signature image' })
  @ApiConsumes('multipart/form-data')
  @RequirePermission(Permissions.Company.Write)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
    }),
  )
  async uploadSignature(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('File is required');
    const uploaded = await this.fileService.upload(file.buffer, {
      category: 'company',
      fileName: file.originalname,
      mimeType: file.mimetype,
      entityType: 'company',
    });
    return { company: await this.companyService.uploadSignature(uploaded.url) };
  }
}
