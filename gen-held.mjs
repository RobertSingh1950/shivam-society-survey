// Generates the HELD baseline in index.html from the 19 August export, so the tool knows
// what we already hold on ANY device instead of only on the phone that typed it.
import fs from 'node:fs';
const TOOL = 'C:/Users/vikas/Code/shivam-society-survey/index.html';
const SURVEY = 'C:/Users/vikas/Code/propertydealersinbhiwadi/docs/ops/society-survey-2026-08-19.md';

const cells = (l) => { const o = []; let c = '', q = false;
  for (let i = 0; i < l.length; i++) { const ch = l[i];
    if (q) { if (ch === '"' && l[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { o.push(c); c = ''; } else c += ch; }
  o.push(c); return o; };

const csv = fs.readFileSync(SURVEY, 'utf8').split('```csv\n')[1].split('```')[0].trim().split('\n');
const head = cells(csv[0]);
const MAP = { maint: 'Maintenance kitna hai?', mwho: 'Maintenance kaun leta hai?', rwa: 'RWA bani hai?',
  noct: 'Transfer / NOC mein kitna time?', nocc: 'NOC ka charge kitna?', bank: 'Kaun se bank loan dete hain?',
  nocw: 'NOC / transfer charge kaun deta hai?', nocx: 'NOC se pehle society aur kya maangti hai?',
  water: 'Paani kitne ghante aata hai?', backup: 'Power backup?', lift: 'Lift ka kya haal hai?',
  club: 'Club house / pool / park?', year: 'Possession kab mili?',
  stock: 'Abhi humare paas yahan kuch bikne ko hai?', loc: 'Kahan par hai? (sector / road ka naam)',
  rent: 'Kiraya kitna chalta hai?', more: 'Aur kuch batana ho?',
  serv: 'Andar ka development?', hand: 'Handover kis ke paas?' };

const held = {};
for (const line of csv.slice(1)) {
  const c = cells(line); const a = {};
  for (const [k, label] of Object.entries(MAP)) {
    const v = (c[head.indexOf(label)] || '').trim();
    if (v) a[k] = v === 'PATA NAHI' ? 'pata nahi' : v;
  }
  held[c[0]] = { visited: c[head.indexOf('Kaise pata chala')].trim() === 'khud gaya', a };
}

// Pretty-print one society per line: this block is read by humans during a re-check, and a
// single 6 KB line is unreviewable in a diff.
const body = Object.entries(held)
  .map(([n, v]) => "  " + JSON.stringify(n) + ": " + JSON.stringify(v) + ",")
  .join('\n');

const block = `var HELD_STAMP = '19 August 2026';
var HELD = {
${body}
};`;

let s = fs.readFileSync(TOOL, 'utf8');
const re = /var HELD_STAMP = '[^']*';\nvar HELD = \{[\s\S]*?\n\};/;
if (re.test(s)) s = s.replace(re, block);
else s = s.replace("// Owner's WhatsApp.", block + "\n\n// Owner's WhatsApp.");
fs.writeFileSync(TOOL, s);
console.log('HELD: ' + Object.keys(held).length + ' societies, ' +
  Object.values(held).reduce((n, v) => n + Object.keys(v.a).length, 0) + ' answers, ' +
  Math.round(block.length / 1024) + ' KB');
