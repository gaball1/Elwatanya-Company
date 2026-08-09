const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// db perms
const dbPerms = new Set(fs.readFileSync(process.env.TEMP + '/opencode/dbperms.txt', 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean));

console.log('== All DB permissions (' + dbPerms.size + ') ==');
console.log([...dbPerms].sort().join('\n'));

const roots = [
  path.join(__dirname, 'frontend', 'app'),
  path.join(__dirname, 'frontend', 'lib'),
  path.join(__dirname, 'frontend', 'components'),
];

const used = new Set();
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.isFile() && /\.(ts|tsx)$/.test(e.name)) {
      const txt = fs.readFileSync(p, 'utf8');
      const re = /permission\s*=\s*['"]([A-Za-z0-9.-]+)['"]/g;
      let m;
      while ((m = re.exec(txt))) used.add(m[1]);
    }
  }
}
for (const d of roots) if (fs.existsSync(d)) walk(d);

const missing = [...used].filter(p => !dbPerms.has(p)).sort();
console.log('FRONTEND used permission tokens:', used.size);
console.log('FRONTEND used but NOT in DB (' + missing.length + '):');
for (const m of missing) console.log('  ', m);
console.log('\nSecondary check — "purchases" tokens in frontend files:');
const hits = [];
for (const d of roots) {
  if (!fs.existsSync(d)) continue;
  const walk2 = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk2(p);
      else if (e.isFile() && /\.(ts|tsx)$/.test(e.name)) {
        const txt = fs.readFileSync(p, 'utf8');
        if (/purchases\./.test(txt)) hits.push(p);
      }
    }
  };
  walk2(d);
}
for (const h of hits) console.log('  ', h);