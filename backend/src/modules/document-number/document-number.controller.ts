import { Controller, Get, Post, Put, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DocumentNumberService } from './application/document-number.service';
import { ResetStrategy } from './domain/document-number.entity';

@ApiTags('Document Number')
@Controller('document-number')
export class DocumentNumberController {
  constructor(private readonly service: DocumentNumberService) {}

  @Get('configs')
  @ApiOperation({ summary: 'List all document number configurations' })
  getAllConfigs() {
    return this.service.getAllConfigs();
  }

  @Get('configs/:documentType')
  @ApiOperation({ summary: 'Get document number config for a type' })
  getConfig(@Param('documentType') documentType: string) {
    return this.service.getConfig(documentType);
  }

  @Put('configs/:documentType')
  @ApiOperation({ summary: 'Configure document number format' })
  configure(
    @Param('documentType') documentType: string,
    @Body() body: { prefix?: string; padding?: number; resetStrategy?: ResetStrategy },
  ) {
    return this.service.configure(documentType, body);
  }

  @Post('configs/:documentType/reset')
  @ApiOperation({ summary: 'Reset counter for a document type' })
  resetCounter(@Param('documentType') documentType: string, @Body('nextNumber') nextNumber?: number) {
    return this.service.resetCounter(documentType, nextNumber);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate a document number' })
  generate(@Body() body: { documentType: string; date?: string }) {
    const date = body.date ? new Date(body.date) : undefined;
    return this.service.generate(body.documentType, date);
  }
}
