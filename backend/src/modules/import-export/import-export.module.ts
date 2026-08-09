import { Module } from '@nestjs/common';
import { ImportExportHandlerRegistry } from './infrastructure/handler-registry.service';
import { JsonFormatProvider } from './infrastructure/formats/json-format.provider';
import { CsvFormatProvider } from './infrastructure/formats/csv-format.provider';
import { ExcelFormatProvider } from './infrastructure/formats/excel-format.provider';
import { ImportExportService } from './import-export.service';
import { ImportExportController } from './import-export.controller';

@Module({
  controllers: [ImportExportController],
  providers: [
    ImportExportHandlerRegistry,
    JsonFormatProvider,
    CsvFormatProvider,
    ExcelFormatProvider,
    ImportExportService,
  ],
  exports: [ImportExportService, ImportExportHandlerRegistry],
})
export class ImportExportModule {
  constructor(
    private readonly importExport: ImportExportService,
    private readonly json: JsonFormatProvider,
    private readonly csv: CsvFormatProvider,
    private readonly xlsx: ExcelFormatProvider,
  ) {
    this.importExport.registerFormatProvider(this.json);
    this.importExport.registerFormatProvider(this.csv);
    this.importExport.registerFormatProvider(this.xlsx);
  }
}
