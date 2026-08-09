import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TemplateRegistry } from '../src/modules/document-engine/templates/template.registry';
import { PrismaService } from '../src/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('Bootstrapping NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const registry = app.get(TemplateRegistry);
  const prisma = app.get(PrismaService);

  console.log(`Found ${registry.getAll().length} registered templates`);

  const project = await prisma.project.findFirst();
  const building = await prisma.building.findFirst();
  const statement = await prisma.statement.findFirst();
  const clientStmt = await prisma.clientStatement.findFirst();
  const subStmt = await prisma.subcontractorStatement.findFirst();
  const subcontractor = await prisma.subcontractor.findFirst();

  const outputDir = path.resolve(__dirname, '..', 'generated-pdfs');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const results: { name: string; filename: string; sizeKB: number; timeMs: number }[] = [];

  for (const tpl of registry.getAll()) {
    const params: Record<string, any> = {
      projectId: project?.id,
      buildingId: building?.id,
      documentNumber: `${tpl.name.toUpperCase()}-VAL-${Date.now()}`,
      generatedBy: 'Validation System',
    };

    if (['contractor_extract', 'client_statement', 'subcontractor_statement'].includes(tpl.name)) {
      params.statementId = tpl.name === 'contractor_extract' ? statement?.id : tpl.name === 'client_statement' ? clientStmt?.id : subStmt?.id;
    }
    if (['contractor_boq', 'contractor_performance'].includes(tpl.name)) {
      params.contractorId = subcontractor?.id;
    }
    if (tpl.name === 'treasury_report') {
      params.openingBalance = 50000000;
    }
    if (['attendance_report', 'payroll_report'].includes(tpl.name)) {
      params.month = new Date().getMonth() + 1;
      params.year = new Date().getFullYear();
    }

    console.log(`\n[${tpl.name}] Generating ${tpl.displayName}...`);
    const start = Date.now();
    try {
      const result = await tpl.generate(params);
      const elapsed = Date.now() - start;
      const fp = path.join(outputDir, result.filename);
      fs.writeFileSync(fp, result.buffer);
      results.push({ name: tpl.name, filename: result.filename, sizeKB: Math.round(result.buffer.length / 1024), timeMs: elapsed });
      console.log(`  ✓ ${result.filename}  (${(result.buffer.length / 1024).toFixed(1)} KB, ${elapsed}ms)`);
    } catch (err: any) {
      console.error(`  ✗ FAILED: ${err.message?.slice(0, 200)}`);
    }
  }

  console.log('\n' + '='.repeat(100));
  console.log('PDF GENERATION RESULTS');
  console.log('='.repeat(100));
  console.log('Template'.padEnd(28) + 'File'.padEnd(50) + 'Size'.padEnd(10) + 'Time');
  console.log('-'.repeat(100));
  for (const r of results) {
    console.log(`${r.name.padEnd(28)}${r.filename.padEnd(50)}${`${r.sizeKB} KB`.padStart(8)}${`${r.timeMs}ms`.padStart(8)}`);
  }
  console.log('='.repeat(100));
  console.log(`Total: ${results.length} PDFs generated in ${outputDir}`);

  await app.close();
}

main().catch(err => { console.error(err); process.exit(1); });
