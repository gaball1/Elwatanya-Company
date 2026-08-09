/* eslint-disable */
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');

let results = [];
let passCount = 0;
let failCount = 0;

function record(name, ok, detail = '') {
  if (ok) passCount++; else failCount++;
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`);
}

function db(sql) {
  const tmp = os.tmpdir() + '\\elwat-db.sql';
  fs.writeFileSync(tmp, sql, 'utf8');
  try {
    const out = execSync(`Get-Content '${tmp}' -Raw | docker exec -i elwataniya-postgres psql -U elwataniya -d elwataniya_erp -t -A`, {
      encoding: 'utf8', shell: 'powershell.exe', timeout: 40000,
    });
    return out.trim();
  } catch (e) {
    return 'ERR:' + String(e.message || '').split('\r\n')[0].slice(0, 140).trim();
  }
}
function dbFirst(sql) {
  const r = db(sql);
  if (r.startsWith('ERR:')) return null;
  const lines = r.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  return lines.length ? lines[0] : null;
}
function dbAll(sql) {
  const r = db(sql);
  if (r.startsWith('ERR:')) return [];
  return r.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
}
// SQL string literal (single-quote escaped)
function q(s) {
  return "'" + String(s).replace(/'/g, "''") + "'";
}
function summary() {
  console.log('\n========== SUMMARY ==========');
  console.log('PASS: ' + passCount + '  FAIL: ' + failCount + '  TOTAL: ' + (passCount + failCount));
  const out = { pass: passCount, fail: failCount, total: passCount + failCount, results };
  fs.writeFileSync('e2e-acceptance-results.json', JSON.stringify(out, null, 2));
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = { record, db, dbFirst, dbAll, summary, wait, q, results: () => results };