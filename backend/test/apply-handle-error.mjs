import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const modulesDir = 'D:/elwataniya-company/backend/src/modules';
const files = glob.sync(modulesDir + '/**/*.controller.ts', { ignore: '**/node_modules/**' });

let changed = 0;
let totalReplacements = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  const original = content;

  if (content.includes('mapError(')) continue;
  if (content.includes('handleError(')) continue;

  const hasBadRequest = content.includes('BadRequestException');
  const hasIsFailure = content.includes('isFailure');
  if (!hasBadRequest || !hasIsFailure) continue;

  // Calculate relative import path
  const relPath = path.relative(path.dirname(file), 'D:/elwataniya-company/backend/src/common/utils/handle-error');
  let importPath = relPath.replace(/\\/g, '/').replace('.ts', '');
  if (!importPath.startsWith('.')) importPath = './' + importPath;

  const importLine = `import { handleError } from '${importPath}';\n`;

  // Find position after last @nestjs/common import
  const commonImportEnd = content.indexOf(`} from '@nestjs/common'`);
  if (commonImportEnd === -1) continue;
  const afterNewline = content.indexOf('\n', commonImportEnd);
  if (afterNewline === -1) continue;

  content = content.slice(0, afterNewline + 1) + importLine + content.slice(afterNewline + 1);

  // Single-line: if (x.isFailure) throw new BadRequestException(y ?? 'msg');
  content = content.replace(
    /if\s*\(\s*(\w+)\.isFailure\s*\)\s*throw\s+new\s+BadRequestException\((\w+(?:\.error\??\.message)?)\s*\?\?\s*'([^']+)'\)\s*;?/g,
    (_, rv, err, msg) => `if (${rv}.isFailure) handleError(${err}, '${msg}');`
  );

  // Multi-line with braces: if (x.isFailure) { throw new BadRequestException(...); }
  content = content.replace(
    /if\s*\(\s*(\w+)\.isFailure\)\s*\{[^}]*throw\s+new\s+BadRequestException\(([^)]+)\)\s*;\s*\}/gs,
    (_, rv, args) => `if (${rv}.isFailure) handleError(${rv}.error, 'Failed to process request');`
  );

  if (content !== original) {
    const count = (content.match(/handleError\(/g) || []).length;
    totalReplacements += count;
    changed++;
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`MODIFIED: ${file} - ${count} replacements`);
  }
}

console.log(`\nTotal files changed: ${changed}`);
console.log(`Total replacements: ${totalReplacements}`);
