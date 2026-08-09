import fs from 'fs';
import { glob } from 'glob';

const files = glob.sync('D:/elwataniya-company/backend/src/modules/**/*.controller.ts', { ignore: '**/node_modules/**' });

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  const original = content;

  // Remove duplicate handleError imports (keep only the first)
  const lines = content.split('\n');
  let foundfirst = false;
  const newLines = lines.filter(line => {
    if (line.includes("import { handleError } from '") || line.includes('import { handleError } from "')) {
      if (foundfirst) return false;
      foundfirst = true;
    }
    return true;
  });
  content = newLines.join('\n');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log('Cleaned: ' + file);
  }
}

console.log('Done.');
